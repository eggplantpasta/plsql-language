import * as vscode from 'vscode';
import { PLDocController } from './pldoc.controller';

import { PlSqlNavigatorVSC as  PlSqlNavigator } from './plsqlNavigator.vscode';
import { PLSQLCursorInfosVSC as PLSQLCursorInfos } from './plsqlNavigator.vscode';
import PLSQLCompletionCustom from './plsqlCompletionCustom';
import PlSqlParser from './plsqlParser.vscode';

export class PLSQLCompletionItemProvider implements vscode.CompletionItemProvider {

    private plDocController = new PLDocController();
    private plsqlCompletionCustom = new PLSQLCompletionCustom();
    private plDocCustomItems: vscode.CompletionItem[];
    private plsqlSnippets:  vscode.CompletionItem[];

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position,
        token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

        return new Promise<vscode.CompletionItem[]>((resolve, reject) => {

            const completeItems: vscode.CompletionItem[] = [];

            const lineText = document.lineAt(position.line).text,
                  text = document.getText(),
                  wordRange = document.getWordRangeAtPosition(position),
                  word = wordRange && document.getText(wordRange),
                  cursorInfos = PlSqlNavigator.getCursorInfos(document, position);

            if (!cursorInfos.previousDot) {
                // PLDOC
                const plDocItem = this.getPlDocItem(document, position, lineText, text);
                if (plDocItem)
                    completeItems.push(plDocItem);

                // PLDOC - custom items
                if (!this.plDocCustomItems)
                    this.plDocCustomItems = this.getPlDocCustomItems(document);
                Array.prototype.push.apply(completeItems, this.filterCompletion(this.plDocCustomItems, word));

                // PLSQL - snippets
                if (!this.plsqlSnippets)
                    this.plsqlSnippets = this.getSnippets();
                Array.prototype.push.apply(completeItems, this.filterCompletion(this.plsqlSnippets, word));

                // Custoom completion
                const objects = this.getCompletionCustomItems(document);
                Array.prototype.push.apply(completeItems, this.filterCompletion(objects, word));

                // TODO symbol in workspace

                return resolve(this.processCompleteItems(completeItems));
            } else {
                if (cursorInfos.previousWord) {
                    // 1. Use plsql.completion.json
                    const members = this.getCompletionCustomItems(document, cursorInfos.previousWord);
                    if (members && members.length) {
                        Array.prototype.push.apply(completeItems, members);
                        return resolve(this.processCompleteItems(completeItems));
                    }

                    // 2. Use Package member completion (spec)
                    this.getPackageItems(document, position, cursorInfos)
                    .then(members => {
                        Array.prototype.push.apply(completeItems, members);
                        return resolve(this.processCompleteItems(completeItems));
                    })
                    .catch(err => {
                        console.log(err);
                        return resolve(undefined);
                    });
                }
            }
        });
    }

    private processCompleteItems(completeItems) {
        // completionItems must be filtered and if empty return undefined
        // otherwise word suggestion are lost ! (https://github.com/Microsoft/vscode/issues/21611)
        if (completeItems.length > 0)
            return completeItems;
    }

    private filterCompletion(items: vscode.CompletionItem[], word: string) {
        // completionItems must be filtered and if empty return undefined
        // otherwise word suggestion are lost ! (https://github.com/Microsoft/vscode/issues/21611)
        if (items && word) {
            const wordL = word.toLowerCase();
            return items.filter(item => item.label.toLowerCase().startsWith(wordL));
        } else if (items)
            return items;
        else return [];
    }

    private createSnippetItem(snippet, origin = ''): vscode.CompletionItem {
        return this.createCompleteItem(vscode.CompletionItemKind.Snippet,
                snippet.prefix, snippet.description, snippet.body.join('\n'), origin);
    }

    private createSymbolItem(symbol: PLSQLSymbol): vscode.CompletionItem {
        const symbolInfo = PlSqlParser.getSymbolsCompletion(symbol);
        return this.createCompleteItem(symbolInfo.kind,
            symbolInfo.label);
    }

    private createCompleteItem(type: vscode.CompletionItemKind, label: string, doc = '', text = label, origin = ''): vscode.CompletionItem {
        const item = new vscode.CompletionItem(label, type);
        if (type === vscode.CompletionItemKind.Snippet) {
            item.insertText = new vscode.SnippetString(text);
        } else
            item.insertText = text;
        item.documentation = doc;
        item.detail = origin;
        return item;
    }

    private getPlDocItem(document: vscode.TextDocument, position: vscode.Position, lineText: string, text: string): vscode.CompletionItem {
        // Empty line, above a function or procedure
        if ((text !== '') && (lineText.trim() === '') && (document.lineCount > position.line + 1)) {

            const nextPos = new vscode.Position(position.line + 1, 0),
                  nextText = text.substr(document.offsetAt(nextPos));

            const snippet = this.plDocController.getDocSnippet(document, nextText);
            if (snippet)
                return this.createSnippetItem(snippet, 'pldoc');
        };
    }

    private getPlDocCustomItems(document: vscode.TextDocument): vscode.CompletionItem[] {
        const snippets = this.plDocController.getCustomSnippets(document);
        if (snippets)
            return snippets.map(snippet => this.createSnippetItem(snippet));
        return [];
    }

    private getSnippets(): vscode.CompletionItem[] {
        if (vscode.workspace.getConfiguration('plsql-language').get<boolean>('snippets.enable')) {
            const parsedJSON = require('../../snippets/plsql.snippets.json');
            return Object.keys(parsedJSON).map(key => this.createSnippetItem(parsedJSON[key], 'plsql.snippets'));
        }
        return [];
    }

    private getPackageItems(document: vscode.TextDocument, position: vscode.Position, cursorInfos: PLSQLCursorInfos): Promise<vscode.CompletionItem[]> {

        return new Promise<vscode.CompletionItem[]>((resolve, reject) => {

            PlSqlNavigator.complete(document, position, cursorInfos)
                .then(symbols => {
                    if (symbols)
                        return resolve(symbols.map(symbol => this.createSymbolItem(symbol)));
                    else
                        return resolve([]);
                })
                .catch(err => resolve([]));
        });
    }

    private getCompletionCustomItems(document: vscode.TextDocument, text?: string): vscode.CompletionItem[] {
        const items = this.plsqlCompletionCustom.getCompletion(document, text);
        if (items)
            return items.map(item => this.createCompleteItem(item.kind, item.label, item.documentation, item.label, 'plsql.completion'));
        return [];
    }

}
