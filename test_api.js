async function testAPI() {
    try {
        const res = await fetch('http://localhost:8080/api/tours?destination=&minStars=0&maxBudget=200000&sortBy=discount');
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}
testAPI();
