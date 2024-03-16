import ollama from 'ollama'

async function localRequest(llm, system_prompt, history, message){
	const response = await ollama.chat({
		model: llm,
		messages: [{role: "system", content: system_prompt}].concat(history, [{ role: 'user', content: message }]),
		stream: false
	  })
	return response
}

export { localRequest };
