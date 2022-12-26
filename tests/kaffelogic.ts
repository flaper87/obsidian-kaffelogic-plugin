import "mocha";
import { assert, expect } from "chai";
import { before } from "mocha";
import { KLLog } from "../src/kaffelogic";
import { fileSystemHandler, klLogManagerForData} from "./helpers";


describe("TokenManager", () => {
	const fsHandler = fileSystemHandler();

    context('get returning value', () => {
        before(() => {
        });

        it('it returns the stored value', async () => {
			let klManager = klLogManagerForData("log.klog");
			let content = await klManager.parse();

			// Test the length is the expected one and that 2 of the
			// expected keys are there.
			expect(content.size).to.equal(89);
			expect(content).to.have.not.all.keys("expect_fc", "roasting_level");

        });
    });
})
