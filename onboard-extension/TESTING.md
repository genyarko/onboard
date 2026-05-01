# Testing the Onboard Extension

## Step 1: Load Environment Variables

Before opening VS Code, ensure your environment variables are loaded:

**PowerShell:**
```powershell
# Navigate to the extension directory
cd "C:\Users\genya\Downloads\merolav onboard\onboard-extension"

# Load .env file (you may need to do this manually)
# Read each line and set as environment variable
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Verify BOB_API_KEY is set
echo $env:BOB_API_KEY
```

## Step 2: Open Extension in VS Code

```powershell
# Open the extension folder in VS Code
code .
```

## Step 3: Launch Extension Development Host

1. In VS Code, press `F5` (or go to Run > Start Debugging)
2. This will:
   - Compile the TypeScript code
   - Open a new "Extension Development Host" window
   - Load your extension in that window

## Step 4: Verify Extension is Active

In the Extension Development Host window:

1. Open the **Debug Console** (View > Debug Console)
2. Look for the message: `Onboard extension is now active`
3. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Type "Onboard" - you should see: `Onboard: X-Ray Repository`
5. Run the command - you should see: "Repo X-Ray command registered - implementation coming soon"

## Step 5: Test Bob Client (Optional)

If you want to test the Bob API connection:

```powershell
# In the extension directory
npx ts-node src/bob/test-client.ts
```

Expected output if successful:
```
Testing Bob client...

✓ BOB_API_KEY is set

Making test API call to Bob...
✓ Bob API call successful!
Response: [Bob's greeting response]
```

## Troubleshooting

### Extension doesn't activate
- Check the Debug Console for error messages
- Verify `out/extension.js` was created (run `npm run compile`)
- Check that `package.json` has correct activation events

### Bob API errors
- Verify `BOB_API_KEY` is set: `echo $env:BOB_API_KEY`
- Check `.env` file has the correct key
- Verify the API endpoint is correct

### Compilation errors
- Run `npm run compile` to see TypeScript errors
- Check that all dependencies are installed: `npm install`

## Next Steps

Once the extension loads successfully:
1. ✅ Mark "Open extension in VS Code and press F5 to verify it loads" as complete
2. 🚀 Ready to begin Phase 1: Repo X-Ray implementation
