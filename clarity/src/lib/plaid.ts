import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

const plaidEnv = process.env.PLAID_ENV as keyof typeof PlaidEnvironments
const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] ?? PlaidEnvironments['sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

export { Products, CountryCode }
