(async()=>{
  if(!process.env.OPENROUTER_API_KEY){
    console.error('NO_KEY');
    process.exit(2);
  }
  try{
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{ role: 'user', content: 'hello' }],
        stream: false
      })
    });
    console.log('STATUS', r.status);
    const text = await r.text();
    console.log(text);
  } catch (e) {
    console.error('ERR', e.message);
    process.exit(3);
  }
})();
