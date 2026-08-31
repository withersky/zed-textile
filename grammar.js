module.exports = grammar({
  name: "textile",

  rules: {
    document: ($) => repeat($._block),

    _block: ($) =>
      choice(
        $._heading,
        $.paragraph,
        $.paragraph_with_attr,
        $.list,
        $.code_block,
        $.table,
        $.blockquote,
        $.line_quote,
        $.footnote_definition,
        $.horizontal_rule,
        $.notextile,
      ),

    //////////////////////////
    // h1. — h6.  (flat — each heading is a standalone block)
    //////////////////////////
    _heading: ($) =>
      choice(
        $._atx_heading1,
        $._atx_heading2,
        $._atx_heading3,
        $._atx_heading4,
        $._atx_heading5,
        $._atx_heading6,
      ),

    _atx_heading1: ($) => seq($.atx_h1_marker, optional($._atx_heading_content), $._newline),
    _atx_heading2: ($) => seq($.atx_h2_marker, optional($._atx_heading_content), $._newline),
    _atx_heading3: ($) => seq($.atx_h3_marker, optional($._atx_heading_content), $._newline),
    _atx_heading4: ($) => seq($.atx_h4_marker, optional($._atx_heading_content), $._newline),
    _atx_heading5: ($) => seq($.atx_h5_marker, optional($._atx_heading_content), $._newline),
    _atx_heading6: ($) => seq($.atx_h6_marker, optional($._atx_heading_content), $._newline),

    atx_h1_marker: ($) => "h1. ",
    atx_h2_marker: ($) => "h2. ",
    atx_h3_marker: ($) => "h3. ",
    atx_h4_marker: ($) => "h4. ",
    atx_h5_marker: ($) => "h5. ",
    atx_h6_marker: ($) => "h6. ",

    _atx_heading_content: ($) =>
      prec(
        2,
        seq(
          optional($._whitespace),
          field("heading_content", alias($._inline, $.inline)),
        ),
      ),

    //////////////////////////
    // Paragraphs
    //////////////////////////
    paragraph: ($) =>
      seq(alias($._inline, $.inline), $._newline),

    // p., p(., p(. p>, p=. p<>. p#id. p.class. p{style}. and combinations
    paragraph_with_attr: ($) =>
      prec(
        2,
        seq(
          alias($._paragraph_marker, $.paragraph_marker),
          optional($._paragraph_content),
          $._newline,
        ),
      ),

    _paragraph_marker: ($) =>
      /p(?:\{[^}\n]*\}|\(+\)*|[<>=]+|#[\w-]+|\.[\w-]+)*\. /,

    _paragraph_content: ($) =>
      prec(
        1,
        seq(
          optional($._whitespace),
          alias($._inline, $.inline),
        ),
      ),

    //////////////////////////
    // Blockquotes
    //////////////////////////
    // bq. text
    blockquote: ($) =>
      prec(
        2,
        seq(
          alias("bq. ", $.blockquote_marker),
          optional($._blockquote_content),
          $._newline,
        ),
      ),

    // > text, >> text, >>> text
    line_quote: ($) =>
      prec(
        2,
        seq(
          alias(/>{1,3} /, $.blockquote_marker),
          alias($._inline, $.inline),
          $._newline,
        ),
      ),

    _blockquote_content: ($) =>
      prec(
        1,
        seq(
          optional($._whitespace),
          alias($._inline, $.inline),
        ),
      ),

    //////////////////////////
    // Footnotes: fn1. definition, [1] reference
    //////////////////////////
    footnote_definition: ($) =>
      prec(
        2,
        seq(
          alias(/fn\d+\. /, $.footnote_marker),
          optional($._footnote_content),
          $._newline,
        ),
      ),

    _footnote_content: ($) =>
      prec(
        1,
        seq(
          optional($._whitespace),
          alias($._inline, $.inline),
        ),
      ),

    //////////////////////////
    // Horizontal rule: ----
    //////////////////////////
    horizontal_rule: ($) => prec(3, seq(/----+/, $._newline)),

    //////////////////////////
    // <notextile>...</notextile>
    //////////////////////////
    notextile: ($) => prec(2, alias(/<notextile>(.|\n)*?<\/notextile>/, $.notextile)),

    //////////////////////////
    // Code blocks: <pre>, bc., pre.
    //////////////////////////
    code_block: ($) =>
      prec(
        2,
        choice(
          // <pre>...</pre> — matched as a single token (tree-sitter regex has no look-ahead)
          alias(/<pre>(.|\n)*?<\/pre>/, $.code_block),
          // bc. <content>
          seq(
            alias("bc. ", $.code_block_delimiter),
            alias(/[^\n]+(\n[^\n]+)*/, $.code_block_content),
          ),
          // pre. <content>
          seq(
            alias("pre. ", $.code_block_delimiter),
            alias(/[^\n]+(\n[^\n]+)*/, $.code_block_content),
          ),
        ),
      ),

    //////////////////////////
    // Tables: |cell|cell|
    table: ($) =>
      prec.right(
        prec(
          2,
          seq(
            alias($._table_row, $.table_row),
            repeat(seq($._newline, alias($._table_row, $.table_row))),
            optional($._newline),
          ),
        ),
      ),

    _table_row: ($) =>
      prec.right(
        seq(
          alias("|", $.table_cell_delimiter),
          repeat(seq(alias($._table_cell, $.table_cell), alias("|", $.table_cell_delimiter))),
        ),
      ),

    _table_cell: ($) =>
      repeat1(
        choice(
          $.strong,
          $.emphasis,
          $.bold_italic,
          $.inline_code,
          $.inserted,
          $.deleted,
          $.superscript,
          $.subscript,
          $.link,
          $.image,
          $._table_word,
          $._whitespace,
        ),
      ),

    _table_word: ($) => /[^ \t\n\r|]+/,

    //////////////////////////
    // Lists: *, **, … and #, ##, …
    //////////////////////////
    list: ($) =>
      choice(
        $._list1, $._list2, $._list3, $._list4, $._list5, $._list6,
        $._olist1, $._olist2, $._olist3, $._olist4, $._olist5, $._olist6,
      ),

    _list1: ($) =>
      prec.right(
        seq(
          alias("* ", $.list_marker),
          repeat(
            choice(
              alias(
                choice($._list6, $._list5, $._list4, $._list3, $._list2),
                $.list,
              ),
              $.paragraph,
            ),
          ),
        ),
      ),
    _list2: ($) =>
      prec.right(
        seq(
          alias("** ", $.list_marker),
          repeat(
            choice(
              alias(choice($._list6, $._list5, $._list4, $._list3), $.list),
              $.paragraph,
            ),
          ),
        ),
      ),
    _list3: ($) =>
      prec.right(
        seq(
          alias("*** ", $.list_marker),
          repeat(
            choice(
              alias(choice($._list6, $._list5, $._list4), $.list),
              $.paragraph,
            ),
          ),
        ),
      ),
    _list4: ($) =>
      prec.right(
        seq(
          alias("**** ", $.list_marker),
          repeat(
            choice(alias(choice($._list6, $._list5), $.list), $.paragraph),
          ),
        ),
      ),
    _list5: ($) =>
      prec.right(
        seq(
          alias("***** ", $.list_marker),
          repeat(choice(alias(choice($._list6), $.list), $.paragraph)),
        ),
      ),
    _list6: ($) =>
      prec.right(
        seq(alias("****** ", $.list_marker), repeat(choice($.paragraph))),
      ),

    _olist1: ($) =>
      prec.right(
        seq(
          alias("# ", $.list_marker),
          repeat(
            choice(
              alias(
                choice($._olist6, $._olist5, $._olist4, $._olist3, $._olist2),
                $.list,
              ),
              $.paragraph,
            ),
          ),
        ),
      ),
    _olist2: ($) =>
      prec.right(
        seq(
          alias("## ", $.list_marker),
          repeat(
            choice(
              alias(choice($._olist6, $._olist5, $._olist4, $._olist3), $.list),
              $.paragraph,
            ),
          ),
        ),
      ),
    _olist3: ($) =>
      prec.right(
        seq(
          alias("### ", $.list_marker),
          repeat(
            choice(
              alias(choice($._olist6, $._olist5, $._olist4), $.list),
              $.paragraph,
            ),
          ),
        ),
      ),
    _olist4: ($) =>
      prec.right(
        seq(
          alias("#### ", $.list_marker),
          repeat(
            choice(alias(choice($._olist6, $._olist5), $.list), $.paragraph),
          ),
        ),
      ),
    _olist5: ($) =>
      prec.right(
        seq(
          alias("##### ", $.list_marker),
          repeat(choice(alias(choice($._olist6), $.list), $.paragraph)),
        ),
      ),
    _olist6: ($) =>
      prec.right(
        seq(alias("###### ", $.list_marker), repeat(choice($.paragraph))),
      ),

    //////////////////////////
    // Inline content
    //////////////////////////
    _inline: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.deleted,
            $.superscript,
            $.subscript,
            $.link,
            $.image,
            $.inline_style,
            $.footnote_ref,
            $.macro,
            $.abbreviation,
            $.auto_link,
            $.email,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // *bold*
    strong: ($) =>
      prec(
        1,
        seq(
          alias("*", $.strong_delimiter),
          $._strong_content,
          alias("*", $.strong_delimiter),
        ),
      ),

    _strong_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.deleted,
            $.superscript,
            $.subscript,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // _italic_
    emphasis: ($) =>
      prec(
        1,
        seq(
          alias("_", $.emphasis_delimiter),
          $._emphasis_content,
          alias("_", $.emphasis_delimiter),
        ),
      ),

    _emphasis_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.deleted,
            $.superscript,
            $.subscript,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // *_bold italic_*
    bold_italic: ($) =>
      prec(
        2,
        seq(
          alias("*_", $.bold_italic_open),
          $._bold_italic_content,
          alias("_*", $.bold_italic_close),
        ),
      ),

    _bold_italic_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.inline_code,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // @code@
    inline_code: ($) =>
      prec(
        1,
        seq(
          alias("@", $.inline_code_delimiter),
          $._inline_code_content,
          alias("@", $.inline_code_delimiter),
        ),
      ),

    _inline_code_content: ($) =>
      prec.right(
        repeat1(
          choice($._inline_word_no_at, $._whitespace),
        ),
      ),

    // +inserted+
    inserted: ($) =>
      prec(
        1,
        seq(
          alias("+", $.inserted_delimiter),
          $._inserted_content,
          alias("+", $.inserted_delimiter),
        ),
      ),

    _inserted_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.deleted,
            $.superscript,
            $.subscript,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // -deleted- (single token: only matches when a closing - exists,
    // so lone hyphens in words like "right-aligned" parse as plain text)
    deleted: ($) => prec(1, alias(/-[^\-\n]+-/, $.deleted)),

    // ^superscript^
    superscript: ($) =>
      prec(
        2,
        seq(
          alias("^", $.superscript_delimiter),
          $._superscript_content,
          alias("^", $.superscript_delimiter),
        ),
      ),

    _superscript_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.deleted,
            $.subscript,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // ~subscript~
    subscript: ($) =>
      prec(
        2,
        seq(
          alias("~", $.subscript_delimiter),
          $._subscript_content,
          alias("~", $.subscript_delimiter),
        ),
      ),

    _subscript_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.deleted,
            $.superscript,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    // %{style}text%
    inline_style: ($) =>
      prec(
        1,
        seq(
          alias("%", $.style_delimiter),
          optional(
            seq(
              alias("{", $.style_attr_open),
              /[^}%\n]+/,
              alias("}", $.style_attr_close),
            ),
          ),
          repeat1(choice($._inline_word, $._whitespace)),
          alias("%", $.style_delimiter),
        ),
      ),

    // [1] footnote reference
    footnote_ref: ($) =>
      prec(
        1,
        seq(
          alias("[", $.footnote_delimiter),
          /[0-9]+/,
          alias("]", $.footnote_delimiter),
        ),
      ),

    // {{macro}}
    macro: ($) =>
      prec(
        1,
        seq(
          alias("{{", $.macro_delimiter),
          /[^{}\n]+/,
          alias("}}", $.macro_delimiter),
        ),
      ),

    // ABBR(abbreviation)
    abbreviation: ($) =>
      prec(
        1,
        alias(/[A-Z][A-Z]+\([^)\n]*\)/, $.abbreviation),
      ),

    // auto URL
    auto_link: ($) =>
      prec(
        1,
        alias(/https?:\/\/[^\s"<>]+/, $.auto_link),
      ),

    // email
    email: ($) =>
      prec(
        1,
        alias(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, $.email),
      ),

    // "link text":url
    link: ($) =>
      prec(
        1,
        seq(
          alias('"', $.link_text_delimiter),
          $._link_text_content,
          alias('"', $.link_text_delimiter),
          alias(":", $.link_url_delimiter),
          field("url", $.link_url),
        ),
      ),

    _link_text_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.deleted,
            $.superscript,
            $.subscript,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

    link_url: ($) => /[^\s"]+/,

    // !image.png!
    image: ($) =>
      prec(
        1,
        seq(
          alias("!", $.image_delimiter),
          field("url", $.image_url),
          alias("!", $.image_delimiter),
        ),
      ),

    image_url: ($) => /[^\s!]+/,

    //////////////////////////
    // Base tokens
    //////////////////////////
    // Words that include all chars except whitespace/newline and inline markup delimiters.
    // NOTE: `|` is excluded so that a line starting with `|` lexes as a table row,
    // not as a long word (tree-sitter returns the longest token, shadowing table_cell_delimiter).
    _inline_word: ($) => /[^ \t\n\r*_@+~^"!%{}\[\]|-]+|[*_+~^"!%{}\[\]|-]/,

    // Inside @code@ we must NOT match @ as a word character.
    _inline_word_no_at: ($) => /[^ \t\n\r@%{}\[\]|-]+|[+~^"*_!%{}\[\]|-]/,

    _whitespace: ($) => /[ \t]+/,
    _newline: ($) => /[\n\r]+/,
  },
});