import { useEffect, useState } from "react";
import { resolveAvatarSrc } from "@/lib/api/account";
import { getVendorAuthToken } from "@/lib/mock-auth";

/**
 * Profile images are often served from the vendor API with Bearer auth.
 * `<img src>` cannot send Authorization, so we fetch the image with the token
 * and display a temporary blob URL when possible.
 */
export function useVendorAvatarDisplayUrl(
  photoPreview: string | null,
  rawStoredPath: string | undefined
): string | undefined {
  const [authBlobUrl, setAuthBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photoPreview) {
      setAuthBlobUrl(null);
      return;
    }

    const resolved = resolveAvatarSrc(rawStoredPath);
    if (!resolved) {
      setAuthBlobUrl(null);
      return;
    }
    if (/^(blob:|data:)/i.test(resolved)) {
      setAuthBlobUrl(null);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const token = getVendorAuthToken();
        const fetchOpts = {
          signal: ac.signal,
          cache: "no-store" as RequestCache,
          headers: {
            Accept: "image/*,*/*",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        };
        let res = await fetch(resolved, fetchOpts);
        if (!res.ok && token) {
          res = await fetch(resolved, {
            signal: ac.signal,
            cache: "no-store" as RequestCache,
            headers: { Accept: "image/*,*/*" },
          });
        }
        if (!res.ok) {
          setAuthBlobUrl(null);
          return;
        }
        const blob = await res.blob();
        if (ac.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        setAuthBlobUrl(url);
      } catch {
        if (!ac.signal.aborted) setAuthBlobUrl(null);
      }
    })();

    return () => {
      ac.abort();
      setAuthBlobUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [photoPreview, rawStoredPath]);

  if (photoPreview) return photoPreview;
  if (authBlobUrl) return authBlobUrl;
  return resolveAvatarSrc(rawStoredPath);
}
