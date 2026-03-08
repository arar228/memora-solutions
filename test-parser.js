import { runParser } from './backend/parser.js';
async function test() {
    try {
        await runParser();
        console.log("Done");
        process.exit(0);
    } catch (e) {
        console.error("FATAL:", e);
        process.exit(1);
    }
}
test();
