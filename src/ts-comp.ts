/// <reference path="..\typescriptServices.d.ts" />

var libraryFileName = "lib.d.ts";
var libString = "declare var ababa: { test: string; ishi: number };";
var compilerFileName = "ababa.ts";
var compilerString = "";

// TypeScript.ScriptSnapshot.StringScriptSnapshot is based
class VersionedStringScriptSnapshot implements TypeScript.IScriptSnapshot {
    public version = 1;
    public referencedFilePaths: string[] = [];
    public importedFilePaths: string[]   = [];

    private _changeRanges: TypeScript.TextChangeRange[];

    constructor(private text: string) {
        this._changeRanges = [null];
    }

    private _createChangeRange(oldText: string, newText: string) {
        var minLen = Math.min(oldText.length, newText.length);
        var oLen = oldText.length;
        var nLen = newText.length;
        var i = 0;
        while (i < minLen && oldText[i] === newText[i]) ++i;
        if (i == minLen) {
            if (nLen === oLen) {
                return TypeScript.TextChangeRange.unchanged;
            } else if (nLen > oLen) {
                var span = new TypeScript.TextSpan(oLen, 0);
                return new TypeScript.TextChangeRange(span, nLen - oLen);
            } else {
                var span = new TypeScript.TextSpan(oLen, oLen - nLen);
                return new TypeScript.TextChangeRange(span, 0);
            }
        }
        // ここにくるということは絶対に newText と oldText に違いがある
        var j = oLen - 1;
        var k = nLen - 1;
        var stop = (oLen > nLen ? oLen - nLen : 0) + i;
        while (stop <= j && oldText[j] === newText[k]) { --j; --k; }
        ++j; ++k;
        var span = new TypeScript.TextSpan(i, j - i);
        return new TypeScript.TextChangeRange(span, k - i);
    }

    public updateText(text: string) {
        this.version++;
        var oldText = this.text;
        this.text = text;
        this._changeRanges.push(this._createChangeRange(oldText, text));
    }

    public getText(start: number, end: number): string {
        return this.text.substring(start, end);
    }

    public getLength(): number {
        return this.text.length;
    }

    public getLineStartPositions(): number[] {
        return TypeScript.TextUtilities.parseLineStarts(TypeScript.SimpleText.fromString(this.text));
    }

    public getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
        var rr = this._changeRanges.slice(scriptVersion, this.version);
        console.log("changeranges:");
        console.log(rr);
        var res = TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(rr);
        console.log("collapsed:");
        console.log(res);
        return res;
        /*
        var span = new TypeScript.TextSpan(0, this.text.length);
        return new TypeScript.TextChangeRange(span, this.text.length);
        */
    }

}

class LanguageServiceHost implements Services.ILanguageServiceHost {

/*
    private libScriptSnapshot = new VersionedStringScriptSnapshot(libString);
    private compilerScriptSnapshot = new VersionedStringScriptSnapshot(compilerString);
    private compilerScriptVersion = 1;
*/
    private _fileManager: TypeScriptScriptFileManager;
    private _fileNames: string[];

    constructor(fileManager: TypeScriptScriptFileManager, fileNames: string[]) {
        this._fileManager = fileManager;
        this._fileNames = fileNames;
    }

    /*
    public updateCompilerScript(scriptStr: string): void {
        this.compilerScriptSnapshot = new VersionedStringScriptSnapshot(scriptStr);
        this.compilerScriptVersion++;
    }
*/

    public information(): boolean {
        return true;
    }
    public debug(): boolean {
        return true;
    }
    public warning(): boolean {
        return true;
    }
    public error(): boolean {
        return true;
    }
    public fatal(): boolean {
        return true;
    }
    public log(s: string): void {
        console.log("[log]" + s);
    }

    public getCompilationSettings(): TypeScript.CompilationSettings {
        return new TypeScript.CompilationSettings();
    }

    public getScriptFileNames(): string[] {
        console.log("called: getScriptFileNames");
        return this._fileNames;//[libraryFileName, compilerFileName];
    }

    public getScriptVersion(fileName: string): number {
        console.log("called: getScriptVersion / " + fileName);
        return this._fileManager.getScriptSnapshot(fileName).version;
        /*
        if (fileName !== libraryFileName) {
            return this.compilerScriptVersion;
        } else {
            return 1;
        }
        */
    }

    public getScriptIsOpen(fileName: string): boolean {
        console.log("called: getScriptIsOpen / " + fileName);
        // TODO これって何に使われるんだろう
        return true;
        return fileName !== libraryFileName;
    }

    public getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
        console.log("called: getScriptSnapshot / " + fileName);
        return this._fileManager.getScriptSnapshot(fileName);
        /*
        switch (fileName) {
            case libraryFileName: return this.libScriptSnapshot;
            case compilerFileName: return this.compilerScriptSnapshot;
        }
        */

        throw new Error("Invalid file name");
    }

    public getDiagnosticsObject(): Services.ILanguageServicesDiagnostics {
        return null;
    }

}

/*
var host = new LanguageServiceHost();
var tssFactory = new Services.TypeScriptServicesFactory();
var pullLangService = tssFactory.createPullLanguageService(host);
var completions;
completions = pullLangService.getCompletionsAtPosition(compilerFileName, 0, false);
console.log(completions);

host.updateCompilerScript("ababa.");
completions = pullLangService.getCompletionsAtPosition(compilerFileName, 6, false);
console.log(completions);

console.log(TypeScript.preProcessFile("test.ts", new VersionedStringScriptSnapshot(
"///<reference path='.\\test.ts' />\n" +
"///<reference path='good.ts' />\n" +
"///<reference path='..\\ababa\\good.ts' />\n" +
"import Test = require('./Test');\n" +
"import Test = require('Test2');\n"
)));
*/


declare var require;
var path = require("path");
//var fs = require("fs");
function readFile(filename) {
    /*
    var fileContent = "";
    var stat = fs.statSync(filename);

    var fd = fs.openSync(filename, "r");
    var bytes = fs.readSync(fd, stat.size, 0, "ascii");
    fileContent += bytes[0];
    fs.closeSync(fd);
    */
    var fileContent = "";
    if (Environment.fileExists(filename)) {
        var fileInfo = Environment.readFile(filename);
        fileContent = fileInfo.contents();
    } else {
        console.log("file not exists: " + filename);
    }
    //console.log(fileContent);

    return fileContent;
}

class TypeScriptScriptFileManager {
    private _files: { [fileName: string]: VersionedStringScriptSnapshot; } = Object.create(null);
    public constructor() {
    }
    getScriptSnapshot(fileName: string): VersionedStringScriptSnapshot {
        return this._files[fileName];
    }
    loadScriptFile(fileName: string) {
        if (this._files[fileName]) {
            // とりあえず現状では何もしない
            // 将来的には変更があったかどうか検知して必要に応じて update するようにしたい
            // TODO
            //this._files[fileName].updateText(scriptContent);
            return true;
        } else {
            // TODO ココらへんの処理ちゃんとしたい
            try {
            var scriptContent = readFile(fileName);
            this._files[fileName] = new VersionedStringScriptSnapshot(scriptContent);
            } catch (err) {
                console.log("ファイル読み込み失敗");
                console.log(err);
                return false;
            }
        }
        var scriptSnapshot = this._files[fileName];
        var result = TypeScript.preProcessFile(fileName, scriptSnapshot);
        //console.log(result);

        var base = path.dirname(fileName);
        scriptSnapshot.referencedFilePaths = [];
        result.referencedFiles.forEach((f) => {
            var p = path.resolve(base, f.path);
            if (this.loadScriptFile(p))
                scriptSnapshot.referencedFilePaths.push(p);
        });
        // TODO import されるファイルは相対位置のものにしか対応してない
        scriptSnapshot.importedFilePaths = [];//result.importedFiles.map((f) => { return path.resolve(base, f.path) });
        result.importedFiles.forEach((f) => {
            var p = path.resolve(base, f.path);
            if (this.loadScriptFile(p))
                scriptSnapshot.importedFilePaths.push(p);
        });
        scriptSnapshot.importedFilePaths.forEach((path) => { this.loadScriptFile(path) });

        return true;
    }
    setScriptContent(fileName: string, scriptContent: string) {
        if (this._files[fileName]) {
            this._files[fileName].updateText(scriptContent);
        } else {
            this._files[fileName] = new VersionedStringScriptSnapshot(scriptContent);
        }
        var scriptSnapshot = this._files[fileName];
        var result = TypeScript.preProcessFile(fileName, scriptSnapshot);
        //console.log(result);

        var base = path.dirname(fileName);
        scriptSnapshot.referencedFilePaths = [];
        result.referencedFiles.forEach((f) => {
            var p = path.resolve(base, f.path);
            if (this.loadScriptFile(p))
                scriptSnapshot.referencedFilePaths.push(p);
        });
        // TODO import されるファイルは相対位置のものにしか対応してない
        scriptSnapshot.importedFilePaths = [];//result.importedFiles.map((f) => { return path.resolve(base, f.path) });
        result.importedFiles.forEach((f) => {
            var p = path.resolve(base, f.path);
            if (this.loadScriptFile(p))
                scriptSnapshot.importedFilePaths.push(p);
        });
        scriptSnapshot.importedFilePaths.forEach((path) => { this.loadScriptFile(path) });
    }
}

export class TypeScriptLanguageService {
    private _fileManager: TypeScriptScriptFileManager;
    private _lss: { [fileName: string]: Services.ILanguageService; } = Object.create(null);
    private _lsHosts: { [fileName: string]: LanguageServiceHost; } = Object.create(null);
    private _tssFactory = new Services.TypeScriptServicesFactory();
    constructor() {
        this._fileManager = new TypeScriptScriptFileManager();
    }
    public setScriptContent(fileName: string, scriptContent: string): void {
        this._fileManager.setScriptContent(fileName, scriptContent);
    }
    public getCompletionsAtLineCol(fileName: string, posLine: number, posCol: number): any {
        var ss = this._fileManager.getScriptSnapshot(fileName);
        if (!this._lss[fileName]) {
            // TODO とりあえず referencedFilePaths を使う
            this._lsHosts[fileName] = new LanguageServiceHost(this._fileManager, [fileName].concat(ss.referencedFilePaths));
            this._lss[fileName] = this._tssFactory.createPullLanguageService(this._lsHosts[fileName]);
        }
        console.log("getComp");
        var snapshot = this._fileManager.getScriptSnapshot(fileName);
        console.log("getsnapshot");
        var position = new TypeScript.LineMap(snapshot.getLineStartPositions(), snapshot.getLength()).getPosition(posLine, posCol);
        console.log("getpos: " + position);
        var lss = this._lss[fileName];
        var completions = lss.getCompletionsAtPosition(fileName, position, true);
        return completions.entries;/*.map((completion) => {
            return lss.getCompletionEntryDetails(fileName, position, completion.name);
        });*/
        //return this._lss[fileName].getCompletionEntryDetails(fileName, position, true);
    }
}

/*
var tsls = new TypeScriptLanguageService();
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
*/
