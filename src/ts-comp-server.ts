declare var require;
declare var process;
//declare var __dirname;

import tss  = require("./ts-comp");
var TypeScriptLanguageService = tss.TypeScriptLanguageService;

var http = require('http');
var sys  = require('sys');
var fs   = require('fs');

var tsls = new TypeScriptLanguageService();
/*
tsls.setScriptContent("test.ts", "");
console.log(tsls.getCompletions("test.ts", 0));
tsls.setScriptContent("test.ts",
    "var test = { a: 1, b: 2 };   test."
    "///<reference path='.\\test.ts' />\n" +
    "///<reference path='good.ts' />\n" +
    "///<reference path='..\\ababa\\good.ts' />\n" +
    "import Test = require('./Test');\n" +
    "import Test = require('Test2');\n"
);
console.log(tsls.getCompletions("test.ts", 34));
*
/* ---------- HTTPサーバ ---------- */

class TSSS_NOT_FOUND {
    public message: string;
    public name: string;
    constructor(msg: string) {
        this.message = msg;
        this.name = "TSSS:NOT_FOUND";
    }
}

var rooter = {
    "/script-content-setter": {
        "POST": (req, res, qparams) => {
            if (!qparams["filepath"] || qparams["filepath"].length !== 1)
                throw new TSSS_NOT_FOUND("1 つの `filepath` パラメータが必要です");

            var filepath = qparams["filepath"][0];
            var body = "";
            req.on("data", (data) => {
                body += data;
            });
            req.on("end", () => {
                console.log("スクリプト更新, 長さ: " + body.length);
                tsls.setScriptContent(filepath, body);
                //console.log(body.split("\n"));
                //var POST = qs.parse(body);
                // use POST

                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end("");
            });
        },
    },

    "/completion-list": {
        "GET": (req, res, qparams) => {
            if (!qparams["filepath"] || qparams["filepath"].length !== 1)
                throw new TSSS_NOT_FOUND("1 つの `filepath` パラメータが必要です");
            if (!qparams["pos_line"] || qparams["pos_line"].length !== 1)
                throw new TSSS_NOT_FOUND("1 つの `pos_line` パラメータが必要です");
            if (!qparams["pos_col"] || qparams["pos_col"].length !== 1)
                throw new TSSS_NOT_FOUND("1 つの `pos_col` パラメータが必要です");

            var filepath = qparams["filepath"][0];
            var posLine = parseInt(qparams["pos_line"][0], 10) - 1;
            var posCol  = parseInt(qparams["pos_col"][0], 10) + 1;

            var completions = tsls.getCompletionsAtLineCol(filepath, posLine, posCol);
            /*
             * { maybeInaccurate: false,
             *   isMemberCompletion: true,
             *   entries: [ { name: 'test', kind: 'property', kindModifiers: 'public' } ] }
             */

            /* vim 用
             *
             * word
             *   補完する単語です。省略不可。
             *
             * abbr
             *   wordのabbrevation（略称）です。このキーが存在する場合、ポップアップメニューに
             *   wordの代わりに表示されます。wordが長すぎる場合に省略表示するために使います。
             *
             * menu
             *   これを設定すると、abbrの後ろに追加情報として表示されます。補完する
             *   単語のファイル名などを設定することが多いです。
             *
             * info
             *   プレビューウインドウに表示する追加情報です。複数行にするときは\nで
             *   区切ります。'completeopt'にpreviewがないと無視されます。大量の情報を
             *   表示できますが、プレビューウインドウを開く処理やプレビューウインドウの
             *   内容を書き換える処理は重いので注意してください。
             *
             * kind
             *   補完候補の種類を表す1文字です。主にオムニ補完で使用されます。
             *   代表的な物は変数を表す’v'や関数を表す’f'、メンバを表す’m'などです。
             *
             * icase
             *   これが0以外に設定されている場合、Vimは要素の大文字小文字を区別しません。
             *   これはポップアップ表示後の要素の絞り込みに関係します。省略すると0になるので、
             *   大文字小文字の違いを区別します。アセンブリ言語やBasic以外では省略し、大文字
             *   小文字を区別した方がよいです。しかし、'ignorecase'相当の動作を自作補完関数でも
             *   行いたい場合、これを1に設定しなければなりません。
             *
             * dup
             *   これが0以外に設定されている場合、wordが同じでも補完候補に追加されます。
             *   省略すると0になるので、重複は無視します。
             */
            var compStrsForVim = completions.map((entry) => {
                return ["{",
                    // TODO "'" をエスケープ
                    "'word': '" + entry.name + "',",
                    "'menu': '" + entry.type + "',",
                    "'info': '" + entry.docComment  + "'",
                "}"].join("");
            });

            console.log("保管結果件数: " + completions.length);
            //console.log(compStrsForVim);
            res.writeHead(200, {"Content-Type": "application/vim-script"}); // これでいいんかなぁ
            //res.end(JSON.stringify(completions)+"\n");
            res.end("[" + compStrsForVim.join(",") + "]");
        },
    },
};

declare var console: any;

http.createServer((req, res) => {

    var dateTime = new Date().toLocaleString(),
    log = function(status) { // ----- log出力用関数
        sys.puts([
            req.headers['x-forwarded-for'] || req.client.remoteAddress, // IP
            dateTime, // アクセスした日時
            req.method, // メソッド
            req.url, // URL
            status, // ステータスコード
            req.headers.referer || '-', // リファラ
            req.headers['user-agent'] || '-' // ユーザーエージェント
        ].join('\t'));
    };
    log(0);

    var pathAndQuery = convertUriToPathAndQuery(req.url);
    var path = pathAndQuery.path;
    var queryParams = pathAndQuery.queryParams;

    var resource = rooter[path];
    if (resource) {
        var handler = resource[req.method];
        if (handler) {
            try {
                handler.call(null, req, res, queryParams);
            } catch (err) {
                console.trace(err);
                if (err && err.stack) console.log(err.stack);
                res.writeHead(200, {"Content-type": "text/plain"});
                res.end("[]");
            }
        } else {
            res.writeHead(405, {"Content-type": "text/plain"});
            res.end("405 Method Not Allowed");
        }
    } else {
        res.writeHead(404, {"Content-type": "text/plain"});
        res.end("404 Not Found");
    }

    /*
    if(req.url === '/favicon.ico') { // ----- とりあえずfaviconだけ
        fs.readFile(__dirname + '/favicon.ico', function(err, data) {
            if(!err) { // ファビコンがあれば200
                res.writeHead(200, {
                    'Content-Type': 'image/vnd.microsoft.icon',
                    'Cache-control': 'private, max-age=86400' // 1日キャッシュさせる
                });
                res.end(data);
                log(200);
            } else { // ファビコンが無かったら404
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('404 Not found.');
                log(404);
            }
        });
    } else { // ----- favicon以外全て200
        res.writeHead(200, {'Content-Type': 'text/html'});
        //res.end(fn.html(req.method + ' ' + fn.h(req.url)));
        res.end("ababa");
        log(200);
    //}
    */

}).listen(8124, '127.0.0.1');

function convertUriToPathAndQuery(uri) {
    // req uri の処理
    var qidx = uri.indexOf("?");
    var path;
    var queryStr;
    if (qidx >= 0) {
        path = uri.substring(0, qidx);
        queryStr = uri.substring(qidx + 1, uri.length);
    } else {
        path = uri;
        queryStr = "";
    }
    var queryParams: { [name: string]: string[] } = {};
    if (queryStr) {
        queryStr.split("&").forEach((kvPairStr) => {
            var eidx = kvPairStr.indexOf("=");
            var name, val;
            if (eidx >= 0) {
                name = kvPairStr.substring(0, eidx);
                val  = kvPairStr.substring(eidx + 1, kvPairStr.length);
            } else {
                name = kvPairStr;
                val  = "";
            }
            if (!queryParams[name]) queryParams[name] = [];
            queryParams[name].push(val);
        });
    }
    return { path: path, queryParams: queryParams };
}

/* ---------- 例外処理 ---------- */

process.on('uncaughtException', (err) => {
    sys.puts('Caught exception: ' + err.message);
    if (err && err.stack) console.log(err.stack);
});
console.log("server start");
