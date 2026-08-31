; Textile highlights for Zed
; Standard capture names: @markup.*, @punctuation.*

; ─── Headings ───
(atx_h1_marker) @punctuation.special
(atx_h2_marker) @punctuation.special
(atx_h3_marker) @punctuation.special
(atx_h4_marker) @punctuation.special
(atx_h5_marker) @punctuation.special
(atx_h6_marker) @punctuation.special

(atx_h1_marker) @_m
(heading_content: (inline) @markup.heading.1)

(atx_h2_marker) @_m
(heading_content: (inline) @markup.heading.2)

(atx_h3_marker) @_m
(heading_content: (inline) @markup.heading.3)

(atx_h4_marker) @_m
(heading_content: (inline) @markup.heading.4)

(atx_h5_marker) @_m
(heading_content: (inline) @markup.heading.5)

(atx_h6_marker) @_m
(heading_content: (inline) @markup.heading.6)

; ─── Lists ───
(list_marker) @punctuation.special

; ─── Code blocks ───
(code_block) @markup.raw
(code_block_delimiter) @punctuation.definition
(code_block_content) @markup.raw

; ─── Inline: strong ───
(strong (strong_delimiter) @punctuation.definition)
(strong) @markup.strong

; ─── Inline: emphasis ───
(emphasis (emphasis_delimiter) @punctuation.definition)
(emphasis) @markup.italic

; ─── Inline: bold italic ───
(bold_italic (bold_italic_open) @punctuation.definition)
(bold_italic (bold_italic_close) @punctuation.definition)
(bold_italic) @markup.strong

; ─── Inline: code ───
(inline_code (inline_code_delimiter) @punctuation.definition)
(inline_code) @markup.raw.inline

; ─── Inline: inserted ───
(inserted (inserted_delimiter) @punctuation.definition)
(inserted) @markup.inserted

; ─── Inline: deleted ───
(deleted (deleted_delimiter) @punctuation.definition)
(deleted) @markup.deleted

; ─── Inline: superscript ───
(superscript (superscript_delimiter) @punctuation.definition)
(superscript) @markup.superscript

; ─── Inline: subscript ───
(subscript (subscript_delimiter) @punctuation.definition)
(subscript) @markup.subscript

; ─── Inline: link ───
(link (link_text_delimiter) @punctuation.definition)
(link (link_url_delimiter) @punctuation.definition)
(link (link_url) @markup.link.url)
(link) @markup.link

; ─── Inline: image ───
(image (image_delimiter) @punctuation.definition)
(image (image_url) @markup.link.image)
(image) @markup.link
