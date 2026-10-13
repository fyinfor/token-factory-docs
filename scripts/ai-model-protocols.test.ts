import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';
import {
  protocolDocuments,
  protocolOverrides,
  walkJsonFiles,
} from './lib/ai-model-protocols';

const docs = protocolDocuments();

test('description placeholders are code literals, not MDX expressions', () => {
  for (const doc of Object.values(docs)) {
    const prose = doc.info.description?.replace(/`[^`]*`/g, '') || '';
    assert.doesNotMatch(prose, /\{(?:model|task_id|video_id)\}/);
  }
});

test('supplemental operations have unique IDs, explicit auth and valid path parameters', () => {
  const ids = new Set<string>();
  for (const doc of Object.values(docs)) {
    for (const [route, item] of Object.entries(doc.paths)) {
      const op = item?.get || item?.post;
      assert.ok(op?.operationId);
      assert.ok(!ids.has(op.operationId));
      ids.add(op.operationId);
      assert.ok(Object.keys(op.responses).length);
      assert.ok(op.security?.length);
      for (const requirement of op.security) {
        for (const name of Object.keys(requirement)) {
          assert.ok(doc.components?.securitySchemes?.[name]);
        }
      }
      for (const match of route.matchAll(/\{([^}]+)\}/g)) {
        assert.ok(
          op.parameters?.some(
            (p) =>
              !('$ref' in p) &&
              p.in === 'path' &&
              p.name === match[1] &&
              p.required
          )
        );
      }
    }
  }
  assert.equal(ids.size, 10);
});

test('streaming and compaction expose distinct transport contracts', () => {
  const stream =
    docs.streamgeneratecontent.paths[
      '/v1beta/models/{model}:streamGenerateContent'
    ]!.post!;
  const alt = stream.parameters?.find(
    (p) => !('$ref' in p) && p.name === 'alt'
  );
  assert.ok(alt && !('$ref' in alt) && alt.required);
  const response = stream.responses['200'];
  assert.ok(
    response && !('$ref' in response) && response.content?.['text/event-stream']
  );
  const compact = docs.compactresponse.paths['/v1/responses/compact']!.post!;
  assert.match(compact.description!, /非流式/);
  assert.match(
    protocolOverrides['post /v1/completions'].description!,
    /prompt/
  );
  assert.match(
    protocolOverrides['post /v1/completions'].description!,
    /choices\[\]\.text/
  );
});

test('new pages and the protocol guide are wired into the generated docs', async () => {
  for (const [id, doc] of Object.entries(docs)) {
    const item = Object.values(doc.paths)[0]!;
    const op = item.get || item.post!;
    const tags = (op.tags?.[0] || '').split('/');
    const slugs: Record<string, string> = {
      '聊天（Chat）': 'chat',
      原生OpenAI格式: 'openai',
      原生Gemini格式: 'gemini',
      '嵌入（Embeddings）': 'embeddings',
      '音频（Audio）': 'audio',
      '模型（Models）': 'models',
      列出模型: 'list',
    };
    const page = `content/docs/zh/api/ai-model/${tags.map((tag) => slugs[tag]).join('/')}/${id}.mdx`;
    const text = await readFile(page, 'utf8');
    assert.ok(text.includes(Object.keys(doc.paths)[0]));
    const ref = text.match(/document=\{"([^"]+)"\}/)?.[1];
    assert.ok(ref);
    await access(ref);
  }
  const guide = await readFile(
    'content/docs/zh/api/ai-model/protocols.mdx',
    'utf8'
  );
  assert.equal(
    guide,
    await readFile('scripts/templates/zh-ai-model-protocols.mdx', 'utf8')
  );
  for (const match of guide.matchAll(/\]\(\.\/([^)]+)\)/g)) {
    await access(path.join('content/docs/zh/api/ai-model', `${match[1]}.mdx`));
  }
  const sidebar = JSON.parse(
    await readFile('content/docs/zh/api/ai-model/meta.json', 'utf8')
  );
  for (const section of [
    'protocols',
    'embeddings',
    'rerank',
    'audio',
    'realtime',
  ]) {
    assert.ok(sidebar.pages.includes(section));
  }
});

test('all AI schemas parse and preserve separate client protocols', async () => {
  const routes = new Set<string>();
  for (const file of await walkJsonFiles('openapi/generated/ai-model')) {
    const doc = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(doc.openapi, '3.1.0');
    for (const route of Object.keys(doc.paths)) routes.add(route);
  }
  for (const route of [
    '/v1/completions',
    '/v1/chat/completions',
    '/v1/responses',
    '/v1/responses/compact',
    '/v1/messages',
    '/v1beta/models/{model}:streamGenerateContent',
    '/v1beta/models/{model}:embedContent',
    '/v1beta/models/{model}:batchEmbedContents',
    '/v1/audio/transcriptions/async',
  ]) {
    assert.ok(routes.has(route), route);
  }
});
