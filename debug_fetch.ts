// Debug latest receipts
async function run() {
    console.log('Fetching latest receipts...');
    try {
        const API_URL = "https://script.google.com/macros/s/AKfycbxUiDhkR6Q4oID5AnC2FAuMg9NAXfRtfX2IMNaXa1RH2DIjO2G_WJakImYbJ2Mvuldn/exec";

        // Fetch latest 20 receipts
        const qs = new URLSearchParams({
            action: "listreceipts",
            page: "1",
            limit: "20",
        });

        const res = await fetch(`${API_URL}?${qs.toString()}`);
        const json = await res.json();
        // const text = await res.text();
        // console.log('Response text (first 500 chars):', text.slice(0, 500));

        console.log('Status:', res.status);
        console.log('Full JSON Response:', JSON.stringify(json, null, 2));
        console.log('Total items available:', json.total);
        if (json.items && json.items.length > 0) {
            console.log('First item FULL:', JSON.stringify(json.items[0], null, 2));
            console.log('First item date:', json.items[0].date);
            console.log('Last item date:', json.items[json.items.length - 1].date);
            console.log('Sample item names:', json.items.slice(0, 3).map((x: any) => x.name));
        } else {
            console.log('No items returned');
        }

    } catch (error) {
        console.error(error);
    }
}

run();
