; Textile outline for Zed
; Matches heading markers and their content

(document
  (atx_h1_marker) @_marker
  .
  (inline) @name @item)

(document
  (atx_h2_marker) @_marker
  .
  (inline) @name @item)

(document
  (atx_h3_marker) @_marker
  .
  (inline) @name @item)

(document
  (atx_h4_marker) @_marker
  .
  (inline) @name @item)

(document
  (atx_h5_marker) @_marker
  .
  (inline) @name @item)

(document
  (atx_h6_marker) @_marker
  .
  (inline) @name @item)