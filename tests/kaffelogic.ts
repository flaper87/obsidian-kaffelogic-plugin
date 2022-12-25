import "mocha";
import { assert, expect } from "chai";
import { before } from "mocha";
import { KLLogManager } from "../src/kaffelogic";
import { fileSystemHandler, resolvePathToData } from "./helpers";


describe("TokenManager", () => {
	const fsHandler = fileSystemHandler();

    context('get returning value', () => {
        before(() => {
        });

        it('it returns the stored value', async () => {
			let klManager = new KLLogManager(resolvePathToData("log.klog"), plugin);
			let content = await klManager.parse();

			// Test the length is the expected one and that 2 of the
			// expected keys are there.
			expect(Object.keys(content)).to.have.lengthOf(85);
			expect(content).to.have.not.all.keys("expect_fc", "roasting_level");
        });
    });
})
