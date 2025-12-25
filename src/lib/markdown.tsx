import React from 'react';

/**
 * Basit markdown renderer - sadece **bold**, linkler ve listeler için
 */
export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Liste item
    if (trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      listItems.push(
        <li key={`li-${index}`} className="text-gray-700">
          {renderInlineMarkdown(content)}
        </li>
      );
      return;
    }

    // Liste bitişi - önceki listeyi ekle
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${listKey++}`} className="list-disc list-inside mb-4 space-y-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }

    // Boş satır
    if (!trimmed) {
      elements.push(<br key={`br-${index}`} />);
      return;
    }

    // Başlık (bold ile başlayan ve biten)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      const content = trimmed.slice(2, -2);
      elements.push(
        <h2 key={`h2-${index}`} className="text-xl font-bold text-gray-900 mt-6 mb-3">
          {content}
        </h2>
      );
      return;
    }

    // Normal paragraf
    elements.push(
      <p key={`p-${index}`} className="mb-4 text-gray-700">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  // Son liste kapanışı
  if (listItems.length > 0) {
    elements.push(
      <ul key={`ul-${listKey++}`} className="list-disc list-inside mb-4 space-y-1">
        {listItems}
      </ul>
    );
  }

  return <>{elements}</>;
}

/**
 * Inline markdown renderer - **bold** ve [link](url) için
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // [text](url) pattern - önce linkleri bul (daha spesifik)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // **bold** pattern
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Önce linkleri bul (daha spesifik olduğu için önce kontrol et)
  const allMatches: Array<{ type: 'bold' | 'link'; start: number; end: number; content: string; url?: string }> = [];

  // Link regex'i reset et
  linkRegex.lastIndex = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    allMatches.push({
      type: 'link',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
      url: match[2],
    });
  }

  // Bold regex'i reset et
  boldRegex.lastIndex = 0;
  while ((match = boldRegex.exec(text)) !== null) {
    // match burada kesinlikle null değil (while koşulu)
    const currentMatch = match;
    
    // Link ile çakışmayan bold'ları ekle
    const isOverlapping = allMatches.some(
      (linkMatch) =>
        linkMatch.type === 'link' &&
        ((currentMatch.index >= linkMatch.start && currentMatch.index < linkMatch.end) ||
          (currentMatch.index + currentMatch[0].length > linkMatch.start &&
            currentMatch.index + currentMatch[0].length <= linkMatch.end) ||
          (currentMatch.index < linkMatch.start &&
            currentMatch.index + currentMatch[0].length > linkMatch.end))
    );
    
    if (!isOverlapping) {
      allMatches.push({
        type: 'bold',
        start: currentMatch.index,
        end: currentMatch.index + currentMatch[0].length,
        content: currentMatch[1],
      });
    }
  }

  // Sırala
  allMatches.sort((a, b) => a.start - b.start);

  // Render et
  lastIndex = 0;
  allMatches.forEach((match, idx) => {
    // Önceki kısmı ekle
    if (match.start > lastIndex) {
      parts.push(text.substring(lastIndex, match.start));
    }

    // Match'i ekle
    if (match.type === 'bold') {
      parts.push(
        <strong key={`bold-${idx}`} className="font-semibold">
          {match.content}
        </strong>
      );
    } else if (match.type === 'link') {
      parts.push(
        <a
          key={`link-${idx}`}
          href={match.url}
          className="text-green-700 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match.content}
        </a>
      );
    }

    lastIndex = match.end;
  });

  // Kalan kısmı ekle
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // Eğer hiç match yoksa, orijinal metni döndür
  if (parts.length === 0) {
    return text;
  }

  return <>{parts}</>;
}

