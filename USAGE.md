# Seal3D Usage Guide

## Quick Start

Your file encryption application is now running at **http://localhost:3000** 🎉

## Features

### 🔒 Encrypt Mode
1. Click on the "Encrypt" button (should be selected by default)
2. Upload a file by:
   - Dragging and dropping it onto the upload area, OR
   - Clicking the upload area to browse your files
3. Enter a strong password in the password field
4. Click "Encrypt & Download"
5. Your encrypted file will be downloaded with a `.encrypted` extension

### 🔓 Decrypt Mode
1. Click on the "Decrypt" button
2. Upload the encrypted file (`.encrypted`)
3. Enter the **same password** you used for encryption
4. Click "Decrypt & Download"
5. Your original file will be downloaded

## Security Features

✅ **100% Client-Side** - All encryption happens in your browser  
✅ **Native Browser Encryption** - Fast AES-256-GCM using Web Crypto API  
✅ **No Server Upload** - Your files never leave your device  
✅ **Private Passwords** - Passwords are never transmitted or stored  
✅ **PBKDF2 Key Derivation** - Secure password-to-key conversion (100,000 iterations)  

## Password Best Practices

- Use at least 12 characters
- Mix uppercase, lowercase, numbers, and symbols
- Don't reuse passwords from other services
- Store your password securely - **lost passwords cannot be recovered**
- Consider using a password manager

## Technical Details

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2-HMAC-SHA256
- **Iterations**: 100,000
- **Random Salt**: 16 bytes per encryption
- **Random IV**: 12 bytes per encryption
- **Implementation**: Native Web Crypto API (supported in all modern browsers)

## Supported File Types

All file types are supported! Encrypt:
- Documents (PDF, DOCX, TXT, etc.)
- Images (JPG, PNG, GIF, etc.)
- Videos (MP4, AVI, MOV, etc.)
- Archives (ZIP, RAR, 7Z, etc.)
- Any other file type

## Testing the Application

### Test 1: Text File
1. Create a simple `.txt` file with some content
2. Encrypt it with password: `test123`
3. Decrypt it with the same password
4. Verify the content matches

### Test 2: Image File
1. Select any image file
2. Encrypt it with a strong password
3. Try to open the `.encrypted` file (it should be unreadable)
4. Decrypt it and verify the image is intact

## Troubleshooting

### "Decryption failed" Error
- **Cause**: Wrong password or corrupted file
- **Solution**: Double-check your password (case-sensitive!)

### File Won't Upload
- **Cause**: File might be too large for memory
- **Solution**: Try with smaller files first (< 100MB recommended)

### Processing Takes Too Long
- **Cause**: Large file or slow device
- **Solution**: Be patient, or try with smaller files

## Demo Files

Create a test file to try the encryption:

```bash
# Create a test text file
echo "This is a secret message!" > test.txt

# Now encrypt it in the browser
# Download it as test.txt.encrypted
# Then decrypt it to verify
```

## Browser Compatibility

Works in modern browsers that support:
- WebAssembly (WASM)
- File API
- Crypto API

Tested on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 15+
- ✅ Edge 90+

## Next Steps

Want to enhance the application? Consider adding:
- Multiple file encryption
- Password strength indicator
- Progress bar for large files
- Download as ZIP for multiple files
- Custom PBKDF2 iteration config
- Share encrypted files via link (with separate password)

Enjoy encrypting! 🔐

