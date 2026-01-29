import Image from 'next/image';
import { NotionBlock } from '@/lib/cms/types';

type RichText = {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
};

function renderRichText(richText: RichText[]): React.ReactNode {
  return richText.map((text, i) => {
    let content: React.ReactNode = text.plain_text;

    if (text.annotations?.bold) content = <strong key={i}>{content}</strong>;
    if (text.annotations?.italic) content = <em key={i}>{content}</em>;
    if (text.annotations?.code)
      content = (
        <code key={i} className="rounded bg-surface px-1 py-0.5 text-sm">
          {content}
        </code>
      );
    if (text.href) {
      content = (
        <a
          key={i}
          href={text.href}
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }

    return <span key={i}>{content}</span>;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Paragraph({ block }: { block: any }) {
  return (
    <p className="mb-4 leading-relaxed">
      {renderRichText(block.paragraph.rich_text)}
    </p>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Heading1({ block }: { block: any }) {
  return (
    <h1 className="mb-4 mt-8 text-3xl font-heading font-bold text-heading">
      {renderRichText(block.heading_1.rich_text)}
    </h1>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Heading2({ block }: { block: any }) {
  return (
    <h2 className="mb-3 mt-6 text-2xl font-heading font-semibold text-heading">
      {renderRichText(block.heading_2.rich_text)}
    </h2>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Heading3({ block }: { block: any }) {
  return (
    <h3 className="mb-2 mt-4 text-xl font-heading font-semibold text-heading">
      {renderRichText(block.heading_3.rich_text)}
    </h3>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BulletedList({ blocks }: { blocks: any[] }) {
  return (
    <ul className="mb-4 list-disc space-y-1 pl-6">
      {blocks.map((block) => (
        <li key={block.id}>
          {renderRichText(block.bulleted_list_item.rich_text)}
        </li>
      ))}
    </ul>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NumberedList({ blocks }: { blocks: any[] }) {
  return (
    <ol className="mb-4 list-decimal space-y-1 pl-6">
      {blocks.map((block) => (
        <li key={block.id}>
          {renderRichText(block.numbered_list_item.rich_text)}
        </li>
      ))}
    </ol>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImageBlock({ block }: { block: any }) {
  const image = block.image;
  const url = image.type === 'file' ? image.file.url : image.external.url;
  const caption = image.caption?.[0]?.plain_text;

  return (
    <figure className="my-6">
      <Image
        src={url}
        alt={caption || ''}
        width={800}
        height={450}
        className="rounded-lg"
        sizes="(min-width: 768px) 800px, 100vw"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Quote({ block }: { block: any }) {
  return (
    <blockquote className="my-4 border-l-4 border-primary pl-4 italic text-text-muted">
      {renderRichText(block.quote.rich_text)}
    </blockquote>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Callout({ block }: { block: any }) {
  const icon = block.callout.icon?.emoji || '💡';
  return (
    <div className="my-4 flex gap-3 rounded-lg bg-primary/10 p-4">
      <span className="text-xl">{icon}</span>
      <div>{renderRichText(block.callout.rich_text)}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Code({ block }: { block: any }) {
  const code = block.code.rich_text.map((t: RichText) => t.plain_text).join('');
  return (
    <pre className="my-4 overflow-x-auto rounded-lg bg-heading p-4 text-sm text-white">
      <code>{code}</code>
    </pre>
  );
}

function Divider() {
  return <hr className="my-6 border-t border-text-muted/20" />;
}

type Props = {
  blocks: NotionBlock[];
};

export function BlockRenderer({ blocks }: Props) {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    // Group consecutive list items
    if (block.type === 'bulleted_list_item') {
      const listBlocks = [];
      while (i < blocks.length && blocks[i].type === 'bulleted_list_item') {
        listBlocks.push(blocks[i]);
        i++;
      }
      elements.push(<BulletedList key={block.id} blocks={listBlocks} />);
      continue;
    }

    if (block.type === 'numbered_list_item') {
      const listBlocks = [];
      while (i < blocks.length && blocks[i].type === 'numbered_list_item') {
        listBlocks.push(blocks[i]);
        i++;
      }
      elements.push(<NumberedList key={block.id} blocks={listBlocks} />);
      continue;
    }

    // Render individual blocks
    switch (block.type) {
      case 'paragraph':
        elements.push(<Paragraph key={block.id} block={block} />);
        break;
      case 'heading_1':
        elements.push(<Heading1 key={block.id} block={block} />);
        break;
      case 'heading_2':
        elements.push(<Heading2 key={block.id} block={block} />);
        break;
      case 'heading_3':
        elements.push(<Heading3 key={block.id} block={block} />);
        break;
      case 'image':
        elements.push(<ImageBlock key={block.id} block={block} />);
        break;
      case 'quote':
        elements.push(<Quote key={block.id} block={block} />);
        break;
      case 'callout':
        elements.push(<Callout key={block.id} block={block} />);
        break;
      case 'code':
        elements.push(<Code key={block.id} block={block} />);
        break;
      case 'divider':
        elements.push(<Divider key={block.id} />);
        break;
      default:
        // Skip unsupported blocks
        break;
    }
    i++;
  }

  return <div className="text-text">{elements}</div>;
}
