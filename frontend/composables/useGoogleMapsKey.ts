const STORAGE_KEY = "smart-traveler:google-maps-api-key";

/**
 * 使用者自備的 Google Maps API Key。只存在使用者自己的瀏覽器（localStorage），
 * 不會送到我們的後端；所有圖資請求都由瀏覽器帶著這把 Key 直接打 Google。
 */
export function useGoogleMapsKey() {
  const apiKey = useState("google-maps-api-key", () => "");
  const loaded = useState("google-maps-api-key-loaded", () => false);

  onMounted(() => {
    if (loaded.value) return;
    apiKey.value = localStorage.getItem(STORAGE_KEY) ?? "";
    loaded.value = true;
  });

  function save(value: string) {
    apiKey.value = value.trim();
    if (apiKey.value) localStorage.setItem(STORAGE_KEY, apiKey.value);
    else localStorage.removeItem(STORAGE_KEY);
  }

  return { apiKey, loaded, save };
}
