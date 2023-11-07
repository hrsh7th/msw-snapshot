import Fastify from 'fastify'
import compress from '@fastify/compress'
import multipart, { MultipartValue } from '@fastify/multipart'
import formbody from '@fastify/formbody'

(async () => {
  const fastify = Fastify()
  await fastify.register(compress, { global: false })
  await fastify.register(multipart, { attachFieldsToBody: true })
  await fastify.register(formbody, {})

  fastify.get('/', async (_, res) => {
    res.type('application/json').compress({
      ok: true
    })
  })

  fastify.get('/data', async (_, res) => {
    res.type('application/json').compress({
      data: "1"
    })
  });

  fastify.get<{
    Querystring: {
      data: string
    }
  }>('/query', async (req, res) => {
    res.type('application/json').compress({
      data: req.query.data
    })
  });

  fastify.post<{
    Body: {
      data: MultipartValue<string>
    }
  }>('/form-data', async (req, res) => {
    res.type('application/json').compress({
      data: req.body.data.value
    })
  });

  fastify.post<{
    Body: {
      data: string
    }
  }>('/form-urlencoded', async (req, res) => {
    res.type('application/json').compress({
      data: req.body.data
    })
  });

  fastify.listen({ port: 3000 }, () => {
    console.log('listening on port 3000')
  })
})()
