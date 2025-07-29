import axios, { AxiosResponse } from 'axios';
import { redisClient } from '../helpers/redisHelper';
import qs from 'qs';

interface AuthTokens {
    access_token: string;
    token_type?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at: number;
}


export class RevolutBusiness {
    
  private clientId: string;
  private clientAssertion: string;
  private authTokens: AuthTokens | null = null;
  private baseURL: string;

  constructor() {

    this.clientId = process.env.REVOLUT_BS_CLIENT_ID;
    this.clientAssertion = process.env.REVOLUT_BS_CLIENT_ASSERTION;
    this.baseURL = process.env.REVOLUT_URL; 

    this.authTokens = {
        access_token: null, // typical expires in 40minutes, so we need to refresh on each request, if it epxires use refreshtoken to get a new one
        refresh_token: null, //this does not expire, we use it to get a new access token in the refreshtoken() function
        // refresh_token: process.env.NODE_ENV === "production" ? 'oa_prod_rtu8pJKd2Je5BdM_OBNP6qU98w4zSmERSNGPT_4gR_Y' : 'oa_sand_lx2u0Mu582_6FJ-M1SFDQJ58OZyWEtD6PGnH8RbRQNM',
        expires_at: null
    }

  }

  private async makeRequest<T>(method: string, endpoint: string, data: any | null = null): Promise<any> {

    if (!this.authTokens) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    // Check if the token is expired
    if (this.isTokenExpired()) {
        // Token is expired, refresh it
        console.log("[RevolutToken] Token expired, refreshing...");
        await this.refreshToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.authTokens.access_token}`,
    };

  
    
    const config: any = { method, maxBodyLength: Infinity, url: `${this.baseURL}${endpoint}`, headers };
  
    if (data) {
      config.data = JSON.stringify(data);
    }
    try {

      const response: AxiosResponse<T> = await axios(config);

      return response.data;

    } catch (error) {

        if (error?.response?.status === 400) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            
            console.error(
              `Request failed ${endpoint} with status ${error.response.status}:`,
              error.response.data.message
            )
            throw new Error(error.response.data.message)
            //return error.response

          } else {
            console.error(`Request failed ${endpoint} with status ${error.response.status}:`, error.message);
          }
      
      //throw error;

    }

  }

  async refreshToken(): Promise<void> {

    try {

        const _authTokens = await redisClient.get('revolut_authTokens');

        const authTokens = JSON.parse(_authTokens);
        if(authTokens){
            if(authTokens.access_token && authTokens.expires_at){
              console.log("fetched tokens from [RedisClient] and expires at: ", authTokens.expires_at)
              this.authTokens = {
                // ...this.authTokens,
                refresh_token: authTokens.refresh_token,
                access_token: authTokens.access_token,
                expires_at: authTokens.expires_at
              }
            }
        }

          //Check if the token has not expired
        if (!this.isTokenExpired()) {
        console.log("[RevolutToken] Token is still valid, no need to refresh.");
           return;
        }
      // if token is expired, refresh it -
      let refresh_token = this.authTokens.refresh_token
      
      if(!refresh_token){
          let _token: any = await redisClient.get('revolut_refresh_token');
          
          if(!_token){
            
            console.log(`[REVOLUT]: Token not found. Needs re-auth`)
            
            return;
          }
          
          refresh_token = JSON.parse(_token);
        }
        
        var data = {
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: this.clientAssertion
        }
        
        const response: AxiosResponse<AuthTokens> = await axios.post(`${this.baseURL}/auth/token`, 
            qs.stringify(data), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              }
            });

        console.log("revolut auth new token: ",response.data.access_token.slice(-6))
        this.authTokens = {
            ...this.authTokens,
            access_token: response.data.access_token,
            expires_at: Date.now() + response.data.expires_in * 1000, // Set new expiration time
        };
        await redisClient.set('revolut_access_token', JSON.stringify(response.data.access_token));
        await redisClient.set('revolut_authTokens', JSON.stringify(this.authTokens));


    } catch (error) {
      console.error('Authentication error in refreshToken:', error);
      throw error;
    }

  }

  async authenticate(auth_code: string): Promise<void> {

    try {

      const data = {
        grant_type: 'authorization_code',
        code: auth_code,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: this.clientAssertion
      }

        const response: AxiosResponse<AuthTokens> = await axios.post(`${this.baseURL}/auth/token`,
            qs.stringify(data), 
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              }

            });
      
        this.authTokens = {
            access_token: response.data.access_token,
            expires_at: Date.now() + response.data.expires_in * 1000, // Set new expiration time
            refresh_token: response.data.refresh_token
        };
        await redisClient.set('revolut_refresh_token', JSON.stringify(response.data.refresh_token));
        await redisClient.set('revolut_authTokens', JSON.stringify(this.authTokens));

    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(`Request failed /auth:`, error.response.data.message);

      } else {
        console.error(`Request failed /auth:`, error.message);
      }
      console.error('Authentication error in Auth:', error);
      throw error;
    }

  }

    // Check if the access token has expired
    isTokenExpired(): boolean {
        
      
        if (this.authTokens.access_token != null && this.authTokens.expires_at !=null ) {
     
          console.log("[RevolutToken] expired at:", this.authTokens.expires_at)  
          return this.authTokens.expires_at <= Date.now();
        }
        return true; // Token is considered expired if not available
    }

  async getAccounts(): Promise<Account[]> {

    try {
      const response: any = await this.makeRequest('GET', '/accounts', '');
      return response;

    } catch (error) {
      console.error('Get Accounts API request error:', error);
      throw error;
    }
  }

  async getAccount(accountId: string): Promise<Account> {
    if (!this.authTokens) {
      throw new Error('Authentication required');
    }
  
    try {
    
      const response: any = await this.makeRequest('GET', `/accounts/${accountId}`, '');
  
      return response;
    } catch (error) {
      console.error('Get Account API request error:', error);
      throw error;
    }
  }
  
  

  async getCounterparties(): Promise<Counterparty[]> {

    try {
      
      const response: any = await this.makeRequest('GET', '/counterparties');
      return response;

    } catch (error) {

      console.error('Get Counterparties API request error:', error);
      throw error;

    }
  }

  async getCounterparty(counterpartyId: string): Promise<Counterparty> {

    try {

      const response: any = await this.makeRequest('GET', `/counterparty/${counterpartyId}`);

      return response

    } catch (error) {
      console.error('Get Counterparty API request error:', error);
      throw error;
    }

  }

  async getTransactions(): Promise<Transaction[]> {
    

    try {
     
      const response: any = await this.makeRequest('GET', '/transactions', '');

      return response

    } catch (error) {
      console.error('Get Transactions API request error:', error);
      throw error;

    }

  }

  async createCounterparty(request: CreateCounterparty): Promise<Counterparty> {
    
    try {

      let accountDetails = {
        profile_type: request.profile_type,
        account_no: '',
        currency: request.currency,
        bank_country: request.address.country,
        address: {...request.address, region: request.address.country },
    }

    if(accountDetails.profile_type === "business"){
      accountDetails["company_name"] = request.name
    } else {
      accountDetails["individual_name"] = {
           first_name : request.individual_name.first_name,
           last_name : request.individual_name.last_name
      }
    }

     if(accountDetails.bank_country === "US"){
      accountDetails["account_no"] = request.account_no
      accountDetails["routing_number"] = request.routing_number

    } else if (accountDetails.bank_country === "AU"){
        accountDetails["account_no"] = request.account_no
        accountDetails["bsb_code"] = request.bsb_code

    } else if (accountDetails.currency === "GBP"){
    // only for GBP accounts
    if (request.sort_code){
      accountDetails["sort_code"] = request.sort_code
    }
    accountDetails["account_no"] = request.account_no
    accountDetails["bank_country"] = 'GB'
    // mutate address as only ISO GB is recognised 
    accountDetails.address.country = 'GB'
    // remove region as it is not required for GB accounts
    delete accountDetails.address.region 
    
  } else if(accountDetails.currency === "EUR"){
    accountDetails["iban"] = request.iban
  } else if (accountDetails.currency === "INR"){
    accountDetails["account_no"] = request.account_no
    accountDetails["ifsc"] = request.ifsc
  } else {
    if (request.sort_code){
      accountDetails["sort_code"] = request.sort_code
    }
    accountDetails["account_no"] = request.account_no
  }
    
  const response: any = await this.makeRequest('POST', '/counterparty', accountDetails);
  
      return response as Counterparty

    } catch (error) {

      console.error('Create Counterparty API request error:', error);
      throw error;

    }
  }


  async makePayment(paymentDetails: CreatePayment): Promise<CreatePaymentResponse> {

    try {

      const response: any = await this.makeRequest('POST', '/pay', paymentDetails);
  
      return response

    } catch (error) {

      console.error('Make Payment API request error:', error);
      throw error;

    }
  }
  

  async initiateTransfer(request: CreateTransfer): Promise<CreatePaymentResponse> {
    

    try {
      
      const response: any = await this.makeRequest('POST', '/transfers', request);

      return response
      
    } catch (error) {

      console.error('Initiate Transfer API request error:', error);
      throw error;

    }
  }
}


 interface Counterparty {
    id: string; 
    name: string; 
    revtag?: string;
    profile_type?: string;
    country?: string;
    state: string; 
    created_at: string;
    updated_at: string; 
    accounts: BankAccount[];
  }

  interface CreateCounterpartyUS extends CreateCounterpartyBase {
    account_no: string;
    iban?: string;
    routing_number: string;
  }

  interface CreateCounterpartyUK extends CreateCounterpartyBase {
    account_no: string;
    sort_code: string;
  }

  interface CreateCounterpartyEU extends CreateCounterpartyBase {
    account_no?: string;
    iban: string;
    bic: string;
  }
  interface CreateCounterpartyOther extends CreateCounterpartyBase {
    account_no: string;
    iban?: string;
    sort_code?: string;
    routing_number?: string;
    bic?: string;
    clabe?: string;
    ifsc?: string;
    bsb_code?: string;
  }

  interface CreateCounterpartyBase {
    company_name?: string;
    profile_type: string; 
    name?: string;
    individual_name?: {
      first_name: string;
      last_name: string;
    };
    bank_country: string;
    currency: string;
    phone?: string;
    revtag?: string;
    address?: {
      street_line1: string;
      street_line2?: string;
      region?: string;
      city: string;
      country: string;
      postcode: string;
    };
  }
 
  
  
  interface CreateCounterparty {
    company_name: string;
    profile_type: string; // 'personal' | 'business'; 
    name?: string;
    individual_name?: {
      first_name: string;
      last_name: string;
    };
    bank_country: string;
    currency: string;
    phone?: string;
    revtag?: string;
    account_no?: string;
    iban?: string;
    sort_code?: string;
    routing_number?: string;
    bic?: string;
    clabe?: string;
    ifsc?: string;
    bsb_code?: string;
    address?: {
      street_line1: string;
      street_line2?: string;
      region?: string;
      city?: string;
      country: string;
      postcode: string;
    };
  }
  
  
  interface GetTransaction{
    from: string; // date-time or date
    to: string; // date-time or date
    counterparty: string; 
    account: string; // uuid
    count: number; // integer
    type: string;
  }
  

  interface Transaction {
    id: string; 
    type: string; 
    request_id?: string;
    state: string; 
    reason_code?: string;
    created_at: string; // date-time, required
    updated_at: string; // date-time, required
    completed_at?: string; // date-time
    scheduled_for?: string; // date
    related_transaction_id?: string; // uuid
    merchant?: Merchant
    reference?: string;
    legs: {
    }[];
    card?: {
      card_number: string; 
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    
  }

  interface Merchant {
    name: string;
    city: string;
    category_code: string;
    country: string;
  }


  interface ErrorResponse {
    code: number; 
    message: string; 
  }

  interface BankAccount {
    id: string; // required (uuid)
    name: string;
    bank_country: string;
    currency: string; // required
    type: string; // required
    account_no: string;
    iban: string;
    sort_code: string;
    routing_number: string;
    bic: string;
    clabe: string;
    ifsc: string;
    bsb_code: string;
    recipient_charges: string;
  }
  
  type Account = {
    id: string; 
    name: string; 
    balance: number;
    currency: string;
    state: string;
    public: boolean;
    created_at: string;
    updated_at: string;ß
  };

  type CreatePayment = {
    request_id: string; 
    account_id: string; 
    receiver: {
      counterparty_id: string;
      account_id?: string; 
    }; 
    amount: number;
    currency?: string;
    reference?: string;
    charge_bearer?: string;
    transfer_reason_code?: string;
  };

  interface CreatePaymentResponse {
    id: string; 
    state: string; 
    created_at: string; 
    completed_at?: string; 
  }
  
  
  
  interface CreateTransfer {
    request_id: string; // required
    source_account_id: string; // required (uuid)
    target_account_id: string; // required (uuid)
    amount: number; // required (double)
    currency: string; // required
    reference: string;
  }
  
  

  
  