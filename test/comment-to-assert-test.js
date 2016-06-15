import assert from "power-assert"
import {
    toAssertFromSource,
    toAssertFromAST
} from "../src/comment-to-assert"
import {parse} from "esprima"
import astEqual from "ast-equal"

function parseToAST(code) {
    var parseOption = {
        loc: true,
        range: true,
        comment: true,
        attachComment: true
    };
    return parse(code, parseOption);
}
describe("comment-to-assert", function () {
    describe("#toAssertFromSource", function () {
        it("should return code", function () {
            var code = "var a = 1;";
            var result = toAssertFromSource(code, "file.js");
            assert(typeof result === "string");
        });
        it("should keep code mean", function () {
            var code = "var a = 1;// comment";
            var result = toAssertFromSource(code, "file.js");
            assert(typeof result === "string");
        });
        it("should convert to assert", function () {
            var code = "1;// => 1";
            var result = toAssertFromSource(code, "file.js");
            assert(typeof result === "string");
        });

        it("should handle module", function () {
            var code = "const a = 1;" +
                "a;// => 1";
            var result = toAssertFromSource(code, "file.js");
            assert(typeof result === "string");
        });
    });
    describe("#toAssertFromAST", function () {
        it("should return AST", function () {
            var AST = parse("var a = 1;", {
                loc: true,
                range: true,
                comment: true
            });
            var result = toAssertFromAST(AST);
            assert(typeof result === "object");
            astEqual(result, AST);
        });
        it("should keep code mean", function () {
            var AST = parseToAST("var a = 1;// comment");
            var result = toAssertFromAST(AST);
            assert(typeof result === "object");
            astEqual(result, AST);
        });
    });
    describe("convert logic", function () {
        it("could handle primitive number", function () {
            var AST = parseToAST(`var a = 1;
            a;// => 1`);
            var result = toAssertFromAST(AST);
            var expected = `var a = 1;
            assert.equal(a, 1);`;
            astEqual(result, expected);
        });
        it("could handle string", function () {
            var AST = parseToAST(`var a = "str";
            a;// => "str"`);
            var result = toAssertFromAST(AST);
            var expected = `var a = "str";
            assert.equal(a, "str");`;
            astEqual(result, expected);
        });
        it("can transform multiple comments", function () {
            var AST = parseToAST("1; // => 1\n" +
                "2; // => 2\n");
            var resultAST = toAssertFromAST(AST);
            astEqual(resultAST, `
            assert.equal(1, 1);
            assert.equal(2, 2);
            `);
        });
        it("can transform + BinaryExpression", function () {
            var AST = parseToAST("var a = function(){return 1;};\n" +
                "a + 1; // => 2");
            var resultAST = toAssertFromAST(AST);
            astEqual(resultAST, `
                var a = function () {
                    return 1;
                };
                assert.equal(a + 1 , 2);
            `);
        });
        it("can transform CallExpression", function () {
            var AST = parseToAST("function add(x,y){ return x + y}\n" +
                "add(1,2);// => 3");
            var resultAST = toAssertFromAST(AST);
            astEqual(resultAST, `
                function add(x, y) {
                    return x + y
                }

                assert.equal(add(1, 2), 3);
            `);
        });
        it("could handle BlockComment", function () {
            var AST = parseToAST(`1; /* => 1 */`);
            var result = toAssertFromAST(AST);
            var expected = `assert.equal(1, 1)`;
            astEqual(result, expected);
        });
        it("could handle object", function () {
            var AST = parseToAST(`var a = [1];
            a;// => [1]`);
            var result = toAssertFromAST(AST);
            var expected = `var a = [1];
            assert.deepEqual(a, [1]);`;
            astEqual(result, expected);
        });
        it("could handle Error", function () {
            var AST = parseToAST(`throw new Error("error");// => Error`);
            var result = toAssertFromAST(AST);
            var expected = `assert.throws(function() {
                throw new Error("error");
            }, Error);`;
            astEqual(result, expected);
        });
        it("can transform console comments", function () {
            var AST = parseToAST("console.log(1); // => 1");
            var resultAST = toAssertFromAST(AST);
            astEqual(resultAST, `
            assert.deepEqual(1, 1);
            `);
        });
    });
});