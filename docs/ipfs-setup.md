# IPFS Gateway Setup for ipfs.solanaclawd.com

## Overview

This document explains how to set up `ipfs.solanaclawd.com` as a custom IPFS gateway using your Pinata account.

## DNS Configuration

### Step 1: Configure CNAME Record

Add a CNAME record in your DNS provider:

| Type | Name | Target | TTL |
|------|------|--------|-----|
| CNAME | ipfs | gateway.pinata.cloud | 300 |

Or if using Cloudflare:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | ipfs | gateway.pinata.cloud | DNS Only (grey) |

### Step 2: Enable SSL/TLS

In Cloudflare (or your CDN):
1. Go to SSL/TLS settings
2. Set to "Full" or "Flexible" mode
3. Enable "Always Use HTTPS"

### Step 3: Pinata Subdomain Setup (Optional)

For dedicated subdomain gateway:

1. Go to [Pinata Gateway Settings](https://app.pinata.cloud/gateway)
2. Add custom subdomain: `ipfs.solanaclawd.com`
3. Add DNS TXT record for verification
4. Pinata will provide SSL certificate

## Environment Variables

The following are already configured in `.env`:

```bash
# NFT.Storage
NFT_STORAGE_KEY=41bb1c08.90dfcf11835745a5be1204541c4b11d0

# Pinata
PINATA_API_KEY=ca4054467ec25b7da179
PINATA_API_SECRET=489976744c8189e32a553b3dbaae366250122584b12ee6fccf292930037a4e98
PINATA_JWT=<your-jwt>
PINATA_GATEWAY=https://ivory-brilliant-meadowlark-451.mypinata.cloud
PINATA_IPFS_GATEWAY=https://ipfs.io
```

## Usage

### Direct IPFS Access

Files uploaded via the `ipfs.upload` endpoint will be accessible at:

```
https://ipfs.solanaclawd.com/ipfs/<CID>
https://gateway.pinata.cloud/ipfs/<CID>
https://ipfs.io/ipfs/<CID> (fallback)
```

### API Endpoints

```typescript
// Upload file (base64)
POST /api/ipfs/upload
{ content: string, name: string, mimeType?: string }

// Upload JSON metadata
POST /api/ipfs/uploadJson
{ metadata: object, name: string }

// Resolve ipfs:// URI to gateway URL
GET /api/ipfs/resolve?uri=ipfs://...

// Get gateway URL for hash
GET /api/ipfs/gatewayUrl?hash=...&usePublic=true
```

### Client Example

```typescript
import { trpc } from '@/lib/trpc';

const { data } = await trpc.ipfs.upload.useMutation({
  mutation: async ({ content, name, mimeType }) => {
    const result = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, name, mimeType }),
    });
    return result.json();
  }
});

// Access uploaded content
const url = `https://ipfs.solanaclawd.com/ipfs/${data.ipfsHash}`;
```

## Testing

Test your setup:

```bash
curl -I https://ipfs.solanaclawd.com/ipfs/QmT78ZuSu4u5ABJiPcWCg6KA2VND4mTASkqEv6JvUy4yD
```

Should return HTTP 200 with the content or redirect.

## Troubleshooting

### Gateway Not Responding
- Check CNAME propagation (may take up to 48 hours)
- Verify SSL certificate is active
- Test with: `nslookup ipfs.solanaclawd.com`

### CORS Issues
Pinata gateway has built-in CORS support for verified gateways.

### Content Not Found
- Ensure the CID is pinned on Pinata
- Check Pinata dashboard for pin status
