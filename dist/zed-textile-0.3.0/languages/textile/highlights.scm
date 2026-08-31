; Textile highlights for Zed
; Capture names follow Zed's style (TextMate-ish): @*.markup
; Theme prefix-matching: @title.markup → theme key "title"
; See Zed's built-in markdown/highlights.scm for reference

; ─── Headings ───
; Marker (h1. etc.) gets punctuation style; content gets title style
(atx_h1_marker) @punctuation.special
(atx_h2_marker) @punctuation.special
(atx_h3_marker) @punctuation.special
(atx_h4_marker) @punctuation.special
(atx_h5_marker) @punctuation.special
(atx_h6_marker) @punctuation.special

; Heading content (inline after marker with . anchor)
(document
  (atx_h1_marker)
  .
  (inline) @title.markup)

(document
  (atx_h2_marker)
  .
  (inline) @title.markup)

(document
  (atx_h3_marker)
  .
  (inline) @title.markup)

(document
  (atx_h4_marker)
  .
  (inline) @title.markup)

(document
  (atx_h5_marker)
  .
  (inline) @title.markup)

(document
  (atx_h6_marker)
  .
  (inline) @title.markup)

; ─── Paragraphs ───
; (mirrors Zed markdown: (paragraph) @text)
(paragraph) @text

; ─── Paragraphs with attributes (p(. p>. p=. p#id. p.class. p{style}.) ───
(paragraph_marker) @punctuation.special
(paragraph_with_attr) @text

; ─── Blockquotes (bq. and > / >> / >>>) ───
(blockquote_marker) @punctuation.special
(blockquote) @text
(line_quote) @text

; ─── Footnotes ───
(footnote_marker) @punctuation.special
(footnote_ref) @punctuation.special

; ─── Horizontal rule (----) ───
(horizontal_rule) @comment.markup

; ─── <notextile>...</notextile> ───
(notextile) @comment.markup

; ─── Tables ───
(table_cell_delimiter) @punctuation.special

; ─── Lists ───
(list_marker) @punctuation.list_marker.markup

; ─── Code blocks ───
; (code_block) covers <pre>...</pre> (single token); deeper delimiter/content captures win for bc./pre.
(code_block) @text.literal.markup
(code_block_delimiter) @punctuation.embedded.markup
(code_block_content) @text.literal.markup

; ─── Inline: strong (bold) ───
(strong) @emphasis.strong.markup

; ─── Inline: emphasis (italic) ───
(emphasis) @emphasis.markup

; ─── Inline: bold italic ───
(bold_italic) @emphasis.strong.markup

; ─── Inline: code ───
(inline_code) @text.literal.markup

; ─── Inline: inserted (+) ───
; No dedicated theme key; use string (yellow in Monokai)
(inserted) @string.markup

; ─── Inline: deleted (-) ───
; Use comment style (dimmed) for deleted text
(deleted) @comment.markup

; ─── Inline: superscript ───
(superscript) @string.special.markup

; ─── Inline: subscript ───
(subscript) @string.special.markup

; ─── Inline: link ───
(link (link_url) @link_uri.markup)
(link) @link_text.markup

; ─── Inline: image ───
(image (image_url) @link_uri.markup)
(image) @link_text.markup

; ─── Inline: style (%{...}text%) ───
(style_delimiter) @punctuation.special
(style_attr_open) @punctuation.special
(style_attr_close) @punctuation.special

; ─── Inline: macro ({{...}}) ───
(macro_delimiter) @punctuation.special
(macro) @text.literal.markup

; ─── Inline: abbreviation ABBR(...) ───
(abbreviation) @string.markup

; ─── Inline: auto links & email ───
(auto_link) @link_uri.markup
(email) @link_uri.markup