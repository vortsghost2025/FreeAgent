# Add Your NASA API Key (Accessibility-Friendly Instructions)

Since you are half-blind and prefer not to view the screen, follow these steps to add your key without needing to see the contents:

1. Create or open the key file:
   - Path: S:\Archive\nasaapi.txt
   - If the folder `S:\Archive` does not exist, create it first.

2. Paste your NASA API key as the **entire content** of that file.
   - Do not include extra spaces or newlines beyond the key itself.
   - Save the file (if using Notepad, ensure encoding is UTF-8 without BOM).

3. Ensure the adapter can find the file:
   - Option A (recommended): set environment variable `NASA_KEY_FILE` to the full path `S:\Archive\nasaapi.txt`.
   - Option B: leave as-is; the adapter defaults to `S:\Archive\nasaapi.txt`.

4. Run the integration test (from the project root):
   - Command: `node --experimental-vm-modules node_modules/jest/bin/jest.js weather_pipeline/nasa_adapter.test.js`
   - If the key is valid and your machine has network access, the test will pass.

5. If you want to run the existing test suite without a key, set `NASA_KEY_FILE` to a dummy file to avoid accidental exposure; the test will skip if the key is missing.

Need help with any step (creating folders, setting env vars, or running the test)? Let me know and I’ll give precise, minimal commands.
