module.exports = grammar({
  name: "textile",

  rules: {
    document: ($) => repeat($._block),

    _block: ($) =>
      choice(
        $._heading,
        $.paragraph,
        $.list,
        $.code_block,
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
    // Lists: *, **, ***, …
    //////////////////////////
    list: ($) =>
      choice($._list1, $._list2, $._list3, $._list4, $._list5, $._list6),

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

    // -deleted-
    deleted: ($) =>
      prec(
        1,
        seq(
          alias("-", $.deleted_delimiter),
          $._deleted_content,
          alias("-", $.deleted_delimiter),
        ),
      ),

    _deleted_content: ($) =>
      prec.right(
        repeat1(
          choice(
            $.strong,
            $.emphasis,
            $.bold_italic,
            $.inline_code,
            $.inserted,
            $.superscript,
            $.subscript,
            $.link,
            $.image,
            $._inline_word,
            $._whitespace,
          ),
        ),
      ),

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
    // Words that include all chars except whitespace/newline.
    _inline_word: ($) => /[^ \t\n\r*_@+~^"!-]+|[*_+~^"!-]/,

    // Inside @code@ we must NOT match @ as a word character.
    _inline_word_no_at: ($) => /[^ \t\n\r@]+|[+~^"*_!-]/,

    _whitespace: ($) => /[ \t]+/,
    _newline: ($) => /[\n\r]+/,
  },
});
