import pdfParse from 'pdf-parse'

const chunks = []
for await (const chunk of process.stdin) {
  chunks.push(chunk)
}
const input = Buffer.concat(chunks)
try {
  const result = await pdfParse(input)
  const out = { text: result?.text || '' }
  process.stdout.write(JSON.stringify(out))
  process.exit(0)
} catch (e) {
  process.stderr.write(String(e?.message || e))
  process.stdout.write(JSON.stringify({ text: '' }))
  process.exit(1)
}
