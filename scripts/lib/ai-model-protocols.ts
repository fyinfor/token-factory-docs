import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  copyFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

type Schema = OpenAPIV3.SchemaObject;
type Operation = OpenAPIV3_1.OperationObject;
type Document = OpenAPIV3_1.Document & { paths: OpenAPIV3_1.PathsObject };

const object = (
  properties: Record<string, Schema>,
  required: string[] = []
): Schema => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
});
const string: Schema = { type: 'string' };
const number: Schema = { type: 'number' };
const integer: Schema = { type: 'integer' };
const boolean: Schema = { type: 'boolean' };
const array = (items: Schema): Schema => ({ type: 'array', items });
const freeObject: Schema = { type: 'object', additionalProperties: true };
const bearer = { BearerAuth: [] };
const geminiSecurity: OpenAPIV3_1.SecurityRequirementObject[] = [
  bearer,
  { GeminiApiKey: [] },
  { GeminiQueryKey: [] },
];
const securitySchemes: Record<string, OpenAPIV3_1.SecuritySchemeObject> = {
  BearerAuth: { type: 'http', scheme: 'bearer' },
  GeminiApiKey: { type: 'apiKey', in: 'header', name: 'x-goog-api-key' },
  GeminiQueryKey: { type: 'apiKey', in: 'query', name: 'key' },
  AnthropicApiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
};

function parameter(
  name: string,
  where: 'path' | 'query',
  description: string
): OpenAPIV3_1.ParameterObject {
  return {
    name,
    in: where,
    required: where === 'path',
    description,
    schema: string,
  };
}

function jsonBody(schema: Schema): OpenAPIV3_1.RequestBodyObject {
  return { required: true, content: { 'application/json': { schema } } };
}

function jsonResponse(schema: Schema): OpenAPIV3_1.ResponsesObject {
  return {
    '200': {
      description: '成功',
      content: { 'application/json': { schema } },
    },
  };
}

function document(
  route: string,
  method: 'get' | 'post',
  operationId: string,
  tag: string,
  summary: string,
  description: string,
  fields: Partial<Operation>
): Document {
  return {
    openapi: '3.1.0',
    info: { title: summary, version: '1.0.0', description },
    components: { securitySchemes },
    paths: {
      [route]: {
        [method]: {
          operationId,
          tags: [tag],
          summary,
          description,
          security: [bearer],
          responses: { '200': { description: '成功' } },
          ...fields,
        },
      },
    },
  };
}

const modelParameter = parameter(
  'model',
  'path',
  '平台可用的模型 ID，不带 models/ 前缀'
);
const content = object(
  {
    role: string,
    parts: array({
      ...freeObject,
      properties: { text: string },
      description:
        '文本使用 text；媒体输入、工具调用等按 Gemini 内容块格式填写。',
    }),
  },
  ['parts']
);
const embeddingRequest = object(
  {
    model: {
      ...string,
      description: '可选，格式为 models/{model}；网关按路径及模型映射设置。',
    },
    content,
    taskType: string,
    title: string,
    outputDimensionality: integer,
  },
  ['content']
);
const embedding = object({ values: array(number) });
const taskStatus: Schema = {
  type: 'string',
  enum: ['pending', 'running', 'succeeded', 'failed'],
};
const asrRequest = object(
  {
    model: string,
    audio_url: {
      ...string,
      description: '上游可访问的音频 URL，与 file_url 二选一。',
    },
    file_url: { ...string, description: 'audio_url 的兼容字段。' },
    language: string,
    response_format: string,
    diarization_enabled: boolean,
  },
  ['model']
);
const asrTask = object(
  {
    task_id: string,
    status: taskStatus,
    model: string,
    created_at: integer,
  },
  ['task_id', 'status', 'model', 'created_at']
);

// Sources: token-factory/router/relay-router.go, dto/{gemini,audio,systemone}.go,
// dto/openai_responses_compaction_request.go and docs/openapi/relay.json.
export function protocolDocuments(): Record<string, Document> {
  const compact = document(
    '/v1/responses/compact',
    'post',
    'compactresponse',
    '聊天（Chat）/原生OpenAI格式',
    'Responses 压缩格式',
    '压缩 Responses 对话上下文，返回 object=response.compaction 和 output。非流式接口；需要支持压缩能力的上游渠道，不属于 Responses 转 Chat Completions 的兼容回退。',
    {
      requestBody: jsonBody(
        object(
          {
            model: string,
            input: { oneOf: [string, array(freeObject)] },
            instructions: string,
            previous_response_id: string,
          },
          ['model']
        )
      ),
      responses: jsonResponse(
        object({
          id: string,
          object: { type: 'string', example: 'response.compaction' },
          created_at: integer,
          output: array(freeObject),
          usage: freeObject,
          error: freeObject,
        })
      ),
    }
  );
  const stream = document(
    '/v1beta/models/{model}:streamGenerateContent',
    'post',
    'streamgeneratecontent',
    '聊天（Chat）/原生Gemini格式',
    'Gemini 流式生成格式',
    '使用 Gemini contents/parts 请求结构。必须传入 alt=sse，网关据此开启流式模式；返回 text/event-stream，每个 data 事件为 Gemini 生成结果，不使用 OpenAI 的 [DONE] 约定。也支持 `/v1/models/{model}:streamGenerateContent?alt=sse` 兼容路径。',
    {
      security: geminiSecurity,
      parameters: [
        modelParameter,
        {
          ...parameter('alt', 'query', '必填，设置为 sse 以启用流式响应。'),
          required: true,
          schema: { type: 'string', enum: ['sse'], default: 'sse' },
        },
      ],
      requestBody: jsonBody(
        object(
          {
            contents: array(content),
            systemInstruction: content,
            generationConfig: freeObject,
            safetySettings: array(freeObject),
            tools: array(freeObject),
            toolConfig: freeObject,
            cachedContent: string,
          },
          ['contents']
        )
      ),
      responses: {
        '200': {
          description:
            'Gemini SSE 事件流；候选内容位于 candidates[].content.parts。',
          content: { 'text/event-stream': { schema: string } },
        },
      },
    }
  );
  const embed = document(
    '/v1beta/models/{model}:embedContent',
    'post',
    'embedcontent',
    '嵌入（Embeddings）',
    'Gemini 原生单条嵌入格式',
    '使用 content.parts 输入文本，返回 embedding.values。不同于 /v1/embeddings 的 input/data[].embedding。也支持 `/v1/models/{model}:embedContent` 兼容路径；维度及任务类型取决于模型。',
    {
      security: geminiSecurity,
      parameters: [modelParameter],
      requestBody: jsonBody(embeddingRequest),
      responses: jsonResponse(object({ embedding })),
    }
  );
  const batchEmbed = document(
    '/v1beta/models/{model}:batchEmbedContents',
    'post',
    'batchembedcontents',
    '嵌入（Embeddings）',
    'Gemini 原生批量嵌入格式',
    '使用 requests 数组提交多条嵌入请求，返回 embeddings[].values。每条请求使用 Gemini content.parts 结构。也支持 `/v1/models/{model}:batchEmbedContents` 兼容路径。',
    {
      security: geminiSecurity,
      parameters: [modelParameter],
      requestBody: jsonBody(
        object({ requests: array(embeddingRequest) }, ['requests'])
      ),
      responses: jsonResponse(object({ embeddings: array(embedding) })),
    }
  );
  const submitAsr = document(
    '/v1/audio/transcriptions/async',
    'post',
    'createasrtask',
    '音频（Audio）',
    '异步语音转录（平台扩展）',
    '平台异步任务协议，不是 OpenAI 标准端点。需要支持异步 ASR 的渠道；提交后使用 task_id 查询，不返回 SSE。JSON 提交 audio_url 或 file_url；multipart 也可提交 file，由平台上传后获取可访问的音频 URL。文件上传依赖附件存储配置。',
    {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              ...asrRequest,
              anyOf: [{ required: ['audio_url'] }, { required: ['file_url'] }],
            },
          },
          'multipart/form-data': {
            schema: {
              ...object(
                {
                  ...asrRequest.properties,
                  file: { type: 'string', format: 'binary' },
                },
                ['model']
              ),
              anyOf: [
                { required: ['audio_url'] },
                { required: ['file_url'] },
                { required: ['file'] },
              ],
            },
          },
        },
      },
      responses: jsonResponse(asrTask),
    }
  );
  const fetchAsr = document(
    '/v1/audio/transcriptions/async/{task_id}',
    'get',
    'getasrtask',
    '音频（Audio）',
    '查询异步语音转录',
    '使用提交响应的 task_id 查询。pending/running 表示尚未完成，succeeded 时读取 text/duration/transcripts，failed 时读取 error。任务访问受账号及令牌模型权限限制。',
    {
      parameters: [parameter('task_id', 'path', '提交接口返回的任务 ID')],
      responses: jsonResponse(
        object({
          ...asrTask.properties,
          text: string,
          duration: { ...number, description: '音频时长，单位为秒。' },
          transcripts: array(
            object({
              sentences: array(
                object({
                  begin_time: integer,
                  end_time: integer,
                  text: string,
                  speaker_id: integer,
                })
              ),
            })
          ),
          error: string,
          finished_at: integer,
        })
      ),
    }
  );
  const systemOne = document(
    '/v1/systemone',
    'post',
    'createsystemone',
    '聊天（Chat）',
    'System One / Jev 原生格式',
    '原生结构化判断协议，使用 model、state 和 questions，不使用 messages 或 prompt 补全结构。默认保留原生扩展字段及响应；渠道配置可映射 model 或覆盖请求参数。非流式；需匹配支持该协议的渠道。',
    {
      requestBody: jsonBody({
        ...object(
          {
            model: string,
            state: { description: '原生状态数据，具体结构由上游协议定义。' },
            questions: {
              description: '原生问题定义，具体结构由上游协议定义。',
            },
          },
          ['model']
        ),
        additionalProperties: true,
      }),
      responses: jsonResponse(freeObject),
    }
  );
  const decisions = document(
    '/api/alpha/decisions',
    'post',
    'createdecision',
    '聊天（Chat）',
    'Jev Decisions 兼容入口',
    '与 /v1/systemone 使用同一原生协议和转发链路。请求使用 model、state、questions；响应保留上游结构。使用平台 Bearer API Key，不是管理接口。非流式。',
    {
      requestBody: systemOne.paths['/v1/systemone']!.post!.requestBody,
      responses: jsonResponse(freeObject),
    }
  );
  const model = object({
    id: string,
    object: string,
    created: integer,
    owned_by: string,
  });
  const anthropicModel = object({
    id: string,
    type: string,
    display_name: string,
    created_at: string,
  });
  const retrieve = document(
    '/v1/models/{model}',
    'get',
    'retrievemodel',
    '模型（Models）',
    '获取模型详情',
    '默认返回 OpenAI 模型结构；同时提供 x-api-key 与 anthropic-version 时返回 Anthropic 模型结构。模型不存在或无权访问时，当前实现可能在 HTTP 200 响应中返回 error，请同时检查响应体。',
    {
      security: [bearer, { AnthropicApiKey: [] }],
      parameters: [
        modelParameter,
        {
          name: 'anthropic-version',
          in: 'header',
          schema: string,
          description: '请求 Anthropic 格式时设置，例如 2023-06-01。',
        },
      ],
      responses: jsonResponse({
        oneOf: [model, anthropicModel, object({ error: freeObject })],
      }),
    }
  );
  const compatibleModels = document(
    '/v1beta/openai/models',
    'get',
    'listopenaicompatiblemodels',
    '模型（Models）/列出模型',
    'OpenAI 兼容模型列表入口',
    '兼容模型列表路径，返回 OpenAI data 数组和 object=list，不返回 Gemini models 数组。可使用 Bearer、x-goog-api-key 或 key 查询参数进行平台令牌鉴权。此路径仅提供模型列表，不表示支持 /v1beta/openai/chat/completions。',
    {
      security: geminiSecurity,
      responses: jsonResponse(object({ object: string, data: array(model) })),
    }
  );
  return {
    compactresponse: compact,
    streamgeneratecontent: stream,
    embedcontent: embed,
    batchembedcontents: batchEmbed,
    createasrtask: submitAsr,
    getasrtask: fetchAsr,
    createsystemone: systemOne,
    createdecision: decisions,
    retrievemodel: retrieve,
    listopenaicompatiblemodels: compatibleModels,
  };
}

export const protocolOverrides: Record<
  string,
  { summary: string; description?: string }
> = {
  'post /v1/completions': {
    summary: 'OpenAI Completions 格式（传统文本补全）',
    description:
      '传统文本补全协议。请求使用 model 和 prompt，返回 choices[].text；不是使用 messages 的 Chat Completions 协议。stream=true 时返回 SSE。是否可用取决于模型及渠道对传统补全的支持。',
  },
  'post /v1/chat/completions': { summary: 'OpenAI Chat Completions 格式' },
  'post /v1/responses': { summary: 'OpenAI Responses 格式' },
  'post /v1/messages': { summary: 'Anthropic Messages 格式' },
  'post /v1/embeddings': { summary: 'OpenAI Embeddings 格式' },
  'post /v1/engines/{model}/embeddings': {
    summary: '历史引擎嵌入入口',
    description:
      '历史兼容路径，不是 Gemini 原生嵌入协议。新接入请使用 /v1/embeddings 或 Gemini 的 :embedContent / :batchEmbedContents；不要仅根据此路径推断支持的请求格式。',
  },
  'post /v1/rerank': { summary: 'Rerank 重排序格式（非 OpenAI 标准）' },
  'post /v1/moderations': { summary: 'OpenAI Moderations 格式' },
  'get /v1/realtime': { summary: 'OpenAI Realtime 格式（WebSocket）' },
  'get /v1/models': {
    summary: '模型列表（按客户端协议选择格式）',
    description:
      '默认返回 OpenAI data 数组；同时提供 x-api-key 和 anthropic-version 时返回 Anthropic data/has_more/first_id/last_id。Gemini 模型列表建议使用 /v1beta/models。列表受账号、令牌及模型可见性限制，不代表每个模型支持全部协议。',
  },
  'get /v1beta/models': { summary: 'Gemini 模型列表格式' },
};

export function protocolFolderTitle(title: string): string {
  return title.replace(/^原生(OpenAI|Gemini|Claude)格式$/, '$1 格式');
}

export async function walkJsonFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkJsonFiles(file)));
    else if (entry.name.endsWith('.json')) files.push(file);
  }
  return files.sort();
}

export async function supplementAiModelSchemas(
  root = './openapi/generated'
): Promise<string[]> {
  const changed: string[] = [];
  const existingRoutes = new Map<string, string>();
  const aiModelDir = path.join(root, 'ai-model');
  for (const file of await walkJsonFiles(aiModelDir)) {
    const doc = JSON.parse(await readFile(file, 'utf8')) as Document;
    let dirty = false;
    for (const [route, item] of Object.entries(doc.paths)) {
      if (!item) continue;
      for (const method of ['get', 'post'] as const) {
        const op = item[method];
        if (!op) continue;
        existingRoutes.set(`${method} ${route}`, file);
        const override = protocolOverrides[`${method} ${route}`];
        // Image-specific Chat Completions examples keep their own title.
        if (
          override &&
          !(
            route === '/v1/chat/completions' &&
            op.operationId !== 'createchatcompletion'
          )
        ) {
          op.summary = override.summary;
          doc.info.title = override.summary;
          if (override.description) {
            op.description = override.description;
            doc.info.description = override.description;
          }
          dirty = true;
        }
        if (route.startsWith('/v1beta/models')) {
          doc.components ??= {};
          doc.components.securitySchemes = {
            ...doc.components.securitySchemes,
            ...securitySchemes,
          };
          op.security = geminiSecurity;
          dirty = true;
        }
        if (route === '/v1/messages') {
          doc.components ??= {};
          doc.components.securitySchemes = {
            ...doc.components.securitySchemes,
            ...securitySchemes,
          };
          op.security = [bearer, { AnthropicApiKey: [] }];
          dirty = true;
        }
        if (route === '/v1/models' && method === 'get') {
          doc.components ??= {};
          doc.components.securitySchemes = {
            ...doc.components.securitySchemes,
            ...securitySchemes,
          };
          op.security = [bearer, { AnthropicApiKey: [] }];
          const response = op.responses['200'];
          if (response && !('$ref' in response)) {
            const original = response.content?.['application/json']?.schema;
            if (original) {
              const anthropic = object({
                data: array(
                  object({
                    id: string,
                    type: string,
                    display_name: string,
                    created_at: string,
                  })
                ),
                has_more: boolean,
                first_id: string,
                last_id: string,
              });
              response.content = {
                'application/json': {
                  schema:
                    '$ref' in original || !original.oneOf
                      ? { oneOf: [original, anthropic] }
                      : original,
                },
              };
            }
          }
        }
      }
    }
    if (dirty) {
      await writeFile(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
      changed.push(file);
    }
  }
  const supplementalDir = path.join(aiModelDir, 'protocols');
  await mkdir(supplementalDir, { recursive: true });
  for (const [id, doc] of Object.entries(protocolDocuments())) {
    const route = Object.keys(doc.paths)[0];
    const method = doc.paths[route]?.get ? 'get' : 'post';
    const file =
      existingRoutes.get(`${method} ${route}`) ||
      path.join(supplementalDir, `${id}.json`);
    await writeFile(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    changed.push(file);
  }
  return [...new Set(changed)];
}

export async function writeAiModelProtocolGuides() {
  const dest = './content/docs/zh/api/ai-model';
  await mkdir(dest, { recursive: true });
  await copyFile(
    './scripts/templates/zh-ai-model-protocols.mdx',
    path.join(dest, 'protocols.mdx')
  );
}
