import puppeteer from 'puppeteer'
const fs = require('fs')

interface InvoiceItemData {
  description: string
  service: string
  quantity: number
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

  let PDFHTML = fs.readFileSync('./src/templates/invoice.html')
    .toString()
    .replace('%%createddate%%', data.issueDate.toLocaleDateString("en-GB"))
    .replace('%%duedate%%', data.dueDate.toLocaleDateString("en-GB"))
    .replace('%%companyname%%', data.companyName)
    .replace('%%companyaddress%%', data.companyAddress ? data.companyAddress : '')
    .replace('%%companycity%%', data.companyCity ? data.companyCity : '')
    .replace('%%companycounty%%', data.companyCounty ? data.companyCounty : '')
    .replace('%%companypostcode%%', data.companyPostcode ? data.companyPostcode : '')
    .replace('%%companycountry%%', data.companyCountry ? data.companyCountry : '')
    .replace('%%invoiceitems%%', await invoiceItemsToHtml(data.invoiceItems))
    .replace('%%subtotal%%', data.subtotal.toFixed(2))
    .replace('%%tax%%', data.tax.toFixed(2))
    .replace('%%total%%', data.total.toFixed(2))
    .replace(/%%currencysymbol%%/g, currencySymbol)
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

export const invoiceItemsToHtml = async (invoiceItems: InvoiceItemData[]) => {
  return invoiceItems.map((item, i) => {
    return `
      <tr class="item">
        <td>
          ${item.description}
        </td>
        <td>
          ${item.service}
        </td>
        <td>
          ${item.quantity}
        </td>
        <td>
          ${item.netAmount.toFixed(2)}
        </td>
      </tr>
    `
  })
}