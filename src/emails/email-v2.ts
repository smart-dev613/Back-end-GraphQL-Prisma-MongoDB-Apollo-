import puppeteer from 'puppeteer'
const fs = require('fs')
import moment from 'moment'
import numeral from 'numeral'

interface InvoiceItemData {
  description: string
  service: string
  quantity: number
  unitAmount: number
  netAmount: number
}

interface InvoicePdfData {
  issueDate?: Date
  dueDate?: Date

  companyName?: string
  companyAddress?: string
  companyCity?: string
  companyCounty?: string
  companyPostcode?: string
  companyCountry?: string
  vatNum?: string
  reference?: string

  userName?: string
  userAddress?: string
  userCity?: string
  userCounty?: string
  userPostcode?: string
  userCountry?: string

  eventname?: string
  logo?: string
  discount?: string
  invoicenumber?: string

  username?: string
  useremail?: string

  invoiceItems?: InvoiceItemData[]
  
  subtotal?: number
  tax?: number
  total?: number

  currency?: string
}

export const createInvoicePDF = async (data: InvoicePdfData) => {
  let currencySymbol = '',
    footer = ''

  switch (data.currency) {
    case 'cny':
    case 'rmb':
      // china (renminbi)
      footer = `英向信息科技（上海）有限公司 ÷ 91310000MA1HMY1U9R ÷ 上海自由贸易试验区张江路665号三层 3rd Floor, No.665, Zhangjiang Road, Pilot Free Trade Zone, Pudong New District, Shanghai, China, 201210 | ByInspired.com`
      break
    case 'twd':
    case 'nt':
      // taiwan
      footer = `Inspired Mobile Ltd Taiwan Branch | 12F, No. 285, Section. 3, Nanjing East. Road, Songshan District, Taipei, Taiwan | byinspired.com |<br />A Company Registered in Taiwan with company number 8375109`
      break
    case 'myr':
    case 'my':
      // malaysia
      footer = `Synkd Sdn Bhd | Level 3A ,Menara TH Uptown, Jalan SS21/39, Damansara Uptown, 47400 Petaling Jaya, Malaysia | synkd.life |<br />A Company Registered in Malaysia with Company Number 201701017523 (1231688-W)`
      break
    case 'sgd':
    case 'sg':
      // singapore
      footer = `Synkd Pte Ltd | 201530092M | 111 North Bridge Road, # 08-18, Peninsula Plaza, Singapore, 1790`
      break
    case 'usd':
    case 'gbp':
    default:
      // uk, us, and ROW
      footer = `Synkd Ltd, 7 Bell Yard, London, WC2A 2JR, United Kingdom<br />A Company Registered in England and Wales with Company Number 8347099 – VAT Number GB 219799845`
      break
  }

  let PDFHTML = fs.readFileSync('./src/templates/invoice-v2.html')
    .toString()
    .replace('%%logo%%', data.logo)
    .replace('%%eventname%%', data.eventname)
    .replace('%%username%%', data.username || '')
    .replace('%%useremail%%', data.useremail || '')
    .replace('%%discount%%', numeral(+data.discount).format('0,0.00'))
    // .replace('%%createddate%%', data.issueDate.toLocaleDateString("en-GB"))
    .replace('%%createddate%%',  moment(data.issueDate).format('D MMM YYYY'))
    // .replace('%%duedate%%', data.dueDate.toLocaleDateString("en-GB"))
    .replace('%%duedate%%', moment(data.dueDate).format('D MMM YYYY'))
    .replace('%%companyname%%', data.companyName)
    .replace('%%companyaddress%%', data.companyAddress ? data.companyAddress : '')
    .replace('%%companycity%%', data.companyCity ? data.companyCity : '')
    .replace('%%companycounty%%', data.companyCounty ? data.companyCounty : '')
    .replace('%%companypostcode%%', data.companyPostcode ? data.companyPostcode : '')
    .replace('%%companycountry%%', data.companyCountry ? data.companyCountry : '')
    .replace('%%vatNum%%', data.vatNum ? data.vatNum : '')
    .replace('%%invoicenumber%%', data.invoicenumber || '')
    .replace('%%username%%', data.userName || '')
    .replace('%%useraddress%%', data.userAddress || '')
    .replace('%%usercity%%', data.userCity || '')
    .replace('%%usercounty%%', data.userCounty || '')
    .replace('%%userpostcode%%', data.userPostcode || '')
    .replace('%%usercountry%%', data.userCountry || '')
    .replace('%%invoiceitems%%', await invoiceItemsToHtml(data.invoiceItems))
    .replace('%%subtotal%%', numeral(+data.subtotal).format('0,0.00'))
    .replace('%%tax%%', numeral(data.tax).format('0,0.00'))
    .replace('%%total%%', numeral(data.total).format('0,0.00'))
    .replace(/%%currencysymbol%%/g, currencySymbol)
    .replace('%%currency%%', data.currency || '')
    .replace('%%footer%%', footer)

  const brows = await puppeteer.launch({ args: ['--no-sandbox'], headless: true })
  var page = await brows.newPage()
  await page.setContent(PDFHTML, {waitUntil: 'networkidle0'})
  const pdf = await page.pdf({
    format: 'A4'
  })
  await brows.close()
  return pdf
}

export const createCustomerInvoicePDF = async (data: InvoicePdfData) => {
  let currencySymbol = ''
  let defaultFooter = ''
  switch (data.currency) {
  case 'cny':
  case 'rmb':
    // china (renminbi)
    defaultFooter = `英向信息科技（上海）有限公司 ÷ 91310000MA1HMY1U9R ÷ 上海自由贸易试验区张江路665号三层 3rd Floor, No.665, Zhangjiang Road, Pilot Free Trade Zone, Pudong New District, Shanghai, China, 201210 | ByInspired.com`
    break
  case 'twd':
  case 'nt':
    // taiwan
    defaultFooter = `Inspired Mobile Ltd Taiwan Branch | 12F, No. 285, Section. 3, Nanjing East. Road, Songshan District, Taipei, Taiwan | byinspired.com |<br />A Company Registered in Taiwan with company number 8375109`
    break
  case 'myr':
  case 'my':
    // malaysia
    defaultFooter = `Synkd Sdn Bhd | Level 3A ,Menara TH Uptown, Jalan SS21/39, Damansara Uptown, 47400 Petaling Jaya, Malaysia | synkd.life |<br />A Company Registered in Malaysia with Company Number 201701017523 (1231688-W)`
    break
  case 'sgd':
  case 'sg':
    // singapore
    defaultFooter = `Synkd Pte Ltd | 201530092M | 111 North Bridge Road, # 08-18, Peninsula Plaza, Singapore, 1790`
    break
  case 'usd':
  case 'gbp':
  default:
    // uk, us, and ROW
    defaultFooter = `Synkd Ltd, 7 Bell Yard, London, WC2A 2JR, United Kingdom<br />A Company Registered in England and Wales with Company Number 8347099 – VAT Number GB 219799845`
    break
  }
  let footerAddress =  `${data.companyName}, ${data.companyAddress}, ${data.companyCity}, ${data.companyPostcode}, ${data.companyCountry}`
  let footer = footerAddress ? footerAddress : defaultFooter
  let disclaimer = `Important: Synkd simply collects payments on behalf of ${data.companyName} and is not responsible for any local Market TAX Computations. Synkd will collect local tax amount and to ${data.companyName}. ${data.companyName} is responsible for all local market tax payments.`
  let PDFHTML = fs.readFileSync('./src/templates/invoice-v2.html')
    .toString()
    .replace('%%logo%%', data.logo)
    .replace('%%eventname%%', data.eventname)
    .replace('%%username%%', data.username || '')
    .replace('%%useremail%%', data.useremail || '')
    .replace('%%discount%%', numeral(+data.discount).format('0,0.00'))
    // .replace('%%createddate%%', data.issueDate.toLocaleDateString("en-GB"))
    .replace('%%createddate%%',  moment(data.issueDate).format('D MMM YYYY'))
    // .replace('%%duedate%%', data.dueDate.toLocaleDateString("en-GB"))
    .replace('%%duedate%%', moment(data.dueDate).format('D MMM YYYY'))
    .replace('%%companyname%%', data.companyName)
    .replace('%%companyaddress%%', data.companyAddress ? data.companyAddress : '')
    .replace('%%companycity%%', data.companyCity ? data.companyCity : '')
    .replace('%%companycounty%%', data.companyCounty ? data.companyCounty : '')
    .replace('%%companypostcode%%', data.companyPostcode ? data.companyPostcode : '')
    .replace('%%companycountry%%', data.companyCountry ? data.companyCountry : '')
    .replace('%%vatNum%%', data.vatNum ? data.vatNum : '')
    .replace('%%invoicenumber%%', data.invoicenumber || '')
    .replace('%%reference%%', data.reference || 'Event')
    .replace('%%username%%', data.userName || '')
    .replace('%%useraddress%%', data.userAddress || '')
    .replace('%%usercity%%', data.userCity || '')
    .replace('%%usercounty%%', data.userCounty || '')
    .replace('%%userpostcode%%', data.userPostcode || '')
    .replace('%%usercountry%%', data.userCountry || '')
    .replace('%%invoiceitems%%', await invoiceItemsToHtml(data.invoiceItems))
    .replace('%%subtotal%%', numeral(+data.subtotal).format('0,0.00'))
    .replace('%%tax%%', numeral(data.tax).format('0,0.00'))
    .replace('%%total%%', numeral(data.total).format('0,0.00'))
    .replace(/%%currencysymbol%%/g, currencySymbol)
    .replace('%%currency%%', data.currency || '')
    .replace('%%footer%%', footer)
    .replace('%%disclaimer%%', disclaimer)

  const brows = await puppeteer.launch({ args: ['--no-sandbox'], headless: true })
  var page = await brows.newPage()
  await page.setContent(PDFHTML, {waitUntil: 'networkidle0'})
  const pdf = await page.pdf({
    format: 'A4'
  })
  await brows.close()
  return pdf
}

export const invoiceItemsToHtml = async (invoiceItems: InvoiceItemData[]) => {
  return invoiceItems.map((item, i) => {
    return `
      <tr>
        <td class="text-left" colspan="3">${item.description}</td>
        <td class="text-left" colspan="1.5">${item.quantity}</td>
        <td class="text-right">${numeral(item.unitAmount).format('0,0.00')}</td>
        <td class="text-right">${numeral(item.netAmount).format('0,0.00')}</td>
      </tr>
    `
  })
}