import React from 'react';

/**
 * Formats product content and returns React elements
 * - Wraps specific labels in <strong> tags
 * - Keeps "İçindekiler:" on the same line
 * - Moves other labels (Net Ağırlık, Süzme Ağırlık, Adet) to new lines
 * - Converts \n to line breaks
 */
export function formatProductContentReact(content: string): React.ReactNode {
  if (!content) return null;

  const text = content.trim();
  
  // Normalize line breaks
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Find all label positions
  const labelPatterns = [
    { pattern: /İçindekiler:/g, name: 'İçindekiler:', newLine: false },
    { pattern: /Net Ağırlık:/g, name: 'Net Ağırlık:', newLine: true },
    { pattern: /Süzme Ağırlık:/g, name: 'Süzme Ağırlık:', newLine: true },
    { pattern: /Adet \(yaklaşık\):/g, name: 'Adet (yaklaşık):', newLine: true },
  ];

  const matches: Array<{ index: number; name: string; newLine: boolean }> = [];

  labelPatterns.forEach(({ pattern, name, newLine }) => {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(normalized)) !== null) {
      matches.push({ index: match.index, name, newLine });
    }
  });

  // Sort by position
  matches.sort((a, b) => a.index - b.index);

  if (matches.length === 0) {
    // No labels found, just split by \n and render
    const lines = normalized.split('\n');
    return (
      <>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  }

  // Build React elements
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    // Get text before this label
    if (match.index > lastIndex) {
      const beforeText = normalized.substring(lastIndex, match.index).trim();
      if (beforeText) {
        // Split by \n and add line breaks
        const lines = beforeText.split('\n');
        lines.forEach((line, lineIdx) => {
          if (lineIdx > 0) {
            elements.push(<br key={`before-br-${i}-${lineIdx}`} />);
          }
          if (line) {
            elements.push(line);
          }
        });
      }
    }

    // Find the end of this label's value (start of next label or end of string)
    const nextMatch = matches[i + 1];
    const valueEnd = nextMatch ? nextMatch.index : normalized.length;
    let value = normalized.substring(match.index + match.name.length, valueEnd).trim();

    // Format the label
    if (match.newLine) {
      // Other labels go on new lines
      elements.push(<br key={`label-br-${i}`} />);
    }
    
    // Add the label with strong tag
    elements.push(
      <strong key={`label-${i}`}>{match.name}</strong>
    );
    
    // Add the value, handling line breaks
    if (value) {
      elements.push(' ');
      const valueLines = value.split('\n');
      valueLines.forEach((line, lineIdx) => {
        if (lineIdx > 0) {
          elements.push(<br key={`value-br-${i}-${lineIdx}`} />);
        }
        if (line) {
          elements.push(line);
        }
      });
    }

    lastIndex = valueEnd;
  });

  return <>{elements}</>;
}
