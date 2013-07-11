" 使い方
" neocomplcache をインストール
" neocomplcache を有効にする NeoComplcacheEnable コマンドを使うとか .vimrc
" に書くとか
" このファイルを .vim/autoload/neocomplcache/sources/ に置く
" TypeScript のファイルを filetype=typescript で開く
" サーバー側を動かしておく
" あとは使うだけ


" filetype が typescript の場合にのみ動作する neocomplcache プラグイン
" jsx_complete.vim を参考にしてます.
" https://github.com/osyo-manga/neocomplcache-jsx/blob/master/autoload/neocomplcache/sources/jsx_complete.vim

let s:source = {
      \ 'name': 'typescript_complete',
      \ 'kind': 'ftplugin',
      \ 'filetypes': { 'typescript': 1 },
      \ }

function! s:source.initialize()
endfunction

function! s:source.finalize()
endfunction

" デバッグ
" echo とか echomsg とか
" mes でメッセージ履歴を見れる

" 補完を開始する桁位置 (0 が行頭)
" とりあえず今はプロパティ名の補完だけに対応するので, カーソル位置の
" 左側にあるドットを探す. 行内にドットがなければ補完しない (-1 を返す).
function! s:source.get_keyword_pos(cur_text)
    let line = getline('.')

    let wsstart = col('.') - 1
    if wsstart <= 0
        return 1
    endif
	" カーソルの左側にあるドットの位置を探す
	while wsstart >= 0
		" ドットより先に空白文字かセミコロンが見つかった場合は補完をしない
		"if line[wsstart] =~ '\s\|;'
        "	"let wsstart = -1
		"	let wsstart += 1
		"	break
		"endif
		" ドットを見つけたらループ終了
		if line[wsstart] =~ '\W'
			break
		endif
		let wsstart -= 1
	endwhile
    echomsg 'keyword_pos: ' + wsstart
    let wsstart += 1
	return wsstart
endfunction

function! s:source.get_complete_words(cur_keyword_pos, cur_keyword_str)
	:echomsg 'hoge'
	if bufname('%') == ''
		return []
	endif

	" 一時ファイルに保存
	" 例: curl -XPOST --data 'var test = { a1: 100, b1: 200 }; test.' http://localhost:8124/script-content-setter?filepath=/test
	let lines = getline(1, '$')
    let buf   = join(lines, "\n")
    ":echomsg buf
	"let shellescaped_buf = shellescape(buf)
    ":echomsg shellescaped_buf
	"let tempfile = expand('%:p:h') . '/' . localtime() . expand('%:t')

	"call writefile(buf, tempfile)
	"let escaped_tempfile = shellescape(tempfile)
	let filepath = expand("%:p")

 ". shellescaped_buf . ' '
	let postcmd = 'curl -s -XPOST --data-binary @- '
		\ . '"http://localhost:8124/script-content-setter'
		\ . '?' . 'filepath=' . filepath
		\ . '"'
	let postres = system(postcmd, buf)

	" 補完候補の取得は, ローカルホストで動かしている HTTP サーバーに任せる
	" HTTP サーバーには一時ファイルのパスと, 補完を行う位置 (プロパティ名の補完は
	" ドットの左側の位置で行われるので, 与えられた pos から 1 ひいている) を渡す.
	" TODO URL のクエリ文字列をパーセントエンコーディングする必要あり
	let command = 'curl -s "http://localhost:8124/completion-list'
		\ . '?' . 'filepath=' . filepath
		\ . '&' . 'pos_line=' . line('.')
		\ . '&' . 'pos_col=' . (a:cur_keyword_pos - 1)
		\ . '"'

	" 例: curl 'http://localhost:8124/completion-list?filepath=/test&position=38'
	" HTTP サーバーにリクエストして, 取得した結果の文字列を辞書のリストに変換
	" (eval すればそのまま値になるような形式の文字列で HTTP サーバーが結果を返すようにしておく.)
	let result = system(command)
    ":echomsg result
    ":echo result
	sandbox let output = eval(result)


	"call delete(tempfile)

	return output
endfunction

function! neocomplcache#sources#typescript_complete#define()
	return s:source
endfunction

