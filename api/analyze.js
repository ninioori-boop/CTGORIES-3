export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const API_KEY = process.env.OPENAI_API_KEY;

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const CATEGORIES = [
      'מזון לבית', 'אוכל בחוץ ובילויים', 'פארם', 'דלק וחניה',
      'מתנות לאירועים ולשמחות', 'ביגוד והנעלה', 'תחב"צ', 'כבישי אגרה',
      'תספורת וקוסמטיקה', 'תחביבים', 'סיגריות', 'חופשה/טיול',
      'עוזרת/שמרטף', 'תיקוני רכב', 'בריאות', 'בעלי חיים',
      'דמי כיס/ילדים', 'יהדות/חגים', 'שונות', 'ביט ללא מעקב', 'מזומן ללא מעקב'
    ];

    const categoriesList = CATEGORIES.join(', ');

    const prompt = `אתה מומחה בניתוח דוחות הוצאות ישראליים.

להלן טקסט מדוח הוצאות:
---
${text}
---

המשימה: מצא את כל ההוצאות/עסקאות וקטלג כל אחת לקטגוריה המתאימה.

קטגוריות ודוגמאות:
- מזון לבית: רמי לוי, שופרסל, מגה, ויקטורי, יוחננוף, סופרים, מכולות
- אוכל בחוץ ובילויים: מסעדות, קפה, פיצריות, סושי, שווארמה, מקדונלדס, WOLT, תן ביס, קולנוע, הופעות
- פארם: סופר פארם, בי פארם, בתי מרקחת
- דלק וחניה: סונול, פז, דור אלון, תחנות דלק, חניונים, פנגו
- מתנות לאירועים ולשמחות: מתנות, פרחים, חתונות, בר מצווה
- ביגוד והנעלה: H&M, זארה, קסטרו, פוקס, חנויות בגדים ונעליים
- תחב"צ: רכבת, אוטובוס, LIME, DOTT, קורקינטים, מוניות, גט
- כבישי אגרה: כביש 6, מנהרות הכרמל
- תספורת וקוסמטיקה: מספרות, סלוני יופי, קוסמטיקה
- תחביבים: חוגים, ספורט, חדר כושר, נטפליקס, ספוטיפיי, GOOGLE, אפליקציות
- סיגריות: סיגריות, טבק, וייפ
- חופשה/טיול: מלונות, צימרים, טיסות, Airbnb, Booking
- עוזרת/שמרטף: עוזרת בית, בייביסיטר
- תיקוני רכב: מוסכים, טיפולי רכב, צמיגים
- בריאות: רופאים, קופות חולים, בדיקות, משקפיים, רופא שיניים
- בעלי חיים: חנויות חיות, וטרינר, מזון לחיות
- דמי כיס/ילדים: צעצועים, גנים, צהרונים, קייטנות
- יהדות/חגים: יודאיקה, פרחים לשבת, חגים
- שונות: כל מה שלא מתאים לקטגוריות אחרות
- ביט ללא מעקב: העברות BIT, פייבוקס
- מזומן ללא מעקב: משיכות כספומט, ATM

לכל הוצאה החזר:
- description: שם בית העסק כפי שמופיע
- amount: הסכום (מספר חיובי בלבד)
- category: קטגוריה מהרשימה למעלה

פורמט תשובה - JSON בלבד:
{"expenses": [{"description": "שם", "amount": 123.45, "category": "קטגוריה"}, ...]}

חוקים חשובים:
- רק הוצאות אמיתיות מהטקסט
- התעלם מכותרות וסיכומים
- סכום חייב להיות מספר חיובי`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || 'OpenAI API error' 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
