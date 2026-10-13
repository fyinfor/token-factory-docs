import { generateFiles, type OperationOutput } from 'fumadocs-openapi';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { OpenAPIV3_1 } from 'openapi-types';
import {
  supplementAiModelSchemas,
  writeAiModelProtocolGuides,
  protocolFolderTitle,
  protocolOverrides,
  protocolDocuments,
} from './lib/ai-model-protocols';

async function main() {
  const files = await supplementAiModelSchemas();
  const overrides = JSON.parse(
    await readFile('./scripts/config/tag-slug-overrides.json', 'utf8')
  ) as Record<string, string>;
  const titles = new Map<string, string>();
  const pages = new Map<
    string,
    { title: string; replaceDescription: boolean }
  >();
  const supplementalIds = new Set(Object.keys(protocolDocuments()));
  const originals = new Map<string, string>();
  // Keep existing supplementary prose when only the schema or title changes.
  for (const file of files) {
    const doc = JSON.parse(
      await readFile(file, 'utf8')
    ) as OpenAPIV3_1.Document;
    for (const [route, item] of Object.entries(doc.paths ?? {})) {
      if (!item) continue;
      for (const method of ['get', 'post'] as const) {
        const op = item[method];
        if (!op) continue;
        const segments = (op.tags?.[0] || 'default').split('/').map((tag) => {
          return (
            overrides[tag] ||
            tag.match(/（([^）]+)）/)?.[1].toLowerCase() ||
            tag.toLowerCase()
          );
        });
        const id = op
          .operationId!.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();
        const page = `./content/docs/zh/api/ai-model/${segments.join('/')}/${id}.mdx`;
        pages.set(page, {
          title: op.summary!,
          replaceDescription:
            !!protocolOverrides[`${method} ${route}`]?.description ||
            supplementalIds.has(op.operationId!),
        });
        try {
          originals.set(page, await readFile(page, 'utf8'));
        } catch {
          // New endpoints have no existing page to preserve.
        }
      }
    }
  }
  await generateFiles({
    input: createOpenAPI({
      input: files.map((file) => file.replaceAll('\\', '/')),
    }),
    output: './content/docs/zh/api/ai-model',
    per: 'custom',
    includeDescription: true,
    addGeneratedComment: true,
    toPages(builder) {
      for (const op of builder.extract().operations) {
        const extracted = builder.fromExtractedOperation(op);
        if (!extracted) continue;
        const operation =
          extracted.operation as unknown as OpenAPIV3_1.OperationObject;
        const tags = (operation.tags?.[0] || 'default').split('/');
        const segments = tags.map((tag) => {
          const hint = tag.match(/（([^）]+)）/)?.[1];
          const slug =
            overrides[tag] || hint?.toLowerCase() || tag.toLowerCase();
          return slug.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
        });
        tags.forEach((tag, index) =>
          titles.set(segments.slice(0, index + 1).join('/'), tag)
        );
        const id = operation.operationId!;
        const fileName = id
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();
        const entry: OperationOutput = {
          type: 'operation',
          schemaId: builder.id,
          item: op,
          path: `${segments.join('/')}/${fileName}.mdx`,
          info: {
            title: extracted.displayName,
            description: operation.description,
          },
        };
        builder.create(entry);
      }
    },
  });
  for (const [page, original] of originals) {
    const info = pages.get(page)!;
    if (!info.replaceDescription) {
      await writeFile(
        page,
        original.replace(/^title:.*$/m, `title: ${info.title}`),
        'utf8'
      );
    }
  }
  for (const [dir, title] of titles) {
    const folder = `./content/docs/zh/api/ai-model/${dir}`;
    await mkdir(folder, { recursive: true });
    const metaPath = `${folder}/meta.json`;
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(await readFile(metaPath, 'utf8'));
    } catch {
      // New protocol folders do not have sidebar metadata yet.
    }
    await writeFile(
      metaPath,
      `${JSON.stringify({ ...meta, title: protocolFolderTitle(title) }, null, 2)}\n`,
      'utf8'
    );
  }
  const sidebar = JSON.parse(
    await readFile('./scripts/config/ai-model-sidebar.json', 'utf8')
  ) as { pages: string[] };
  await writeFile(
    './content/docs/zh/api/ai-model/meta.json',
    `${JSON.stringify({ title: 'AI 模型接口', pages: sidebar.pages }, null, 2)}\n`,
    'utf8'
  );
  await writeAiModelProtocolGuides();
  console.log(
    `Updated ${files.length} AI protocol schemas and their Chinese docs.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
