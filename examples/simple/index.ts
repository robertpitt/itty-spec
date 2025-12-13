import { contract } from "./contract"
import { contractRouter } from "../../src/index.ts";

const router = contractRouter({
  contract,
  handlers: {
    getCalculate: async (request) => {
      return request.json({result: request.query.a + request.query.b}, 200)
    },
  },
});

/**
 * Example of incoming request
 */
router.fetch(new Request('http://localhost:3000/calculate?a=1&b=2'), {
  method: 'GET',
});