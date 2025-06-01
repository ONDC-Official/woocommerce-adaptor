const path = require('path');
const fs = require('fs');
const KeyTester = require('../../scripts/keyTester');

describe('KeyTester', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__');
    let keyTester;

    beforeAll(() => {
        // Ensure fixtures directory exists
        if (!fs.existsSync(fixturesDir)) {
            fs.mkdirSync(fixturesDir, { recursive: true });
        }
    });

    beforeEach(() => {
        keyTester = new KeyTester(fixturesDir);
    });

    test('should detect missing signing key', () => {
        const result = keyTester.testSigningKey();
        expect(result.success).toBe(false);
        expect(result.error).toContain('Signing key not found');
    });

    test('should verify all keys', () => {
        const results = keyTester.verifyKeys();
        expect(results).toHaveProperty('signing');
        expect(results).toHaveProperty('isValid');
    });
});