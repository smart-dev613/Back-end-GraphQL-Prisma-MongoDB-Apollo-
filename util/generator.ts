export class Generator {

  public static generateString (length: number): string {
    let output = ''
    let allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++) {
      output += allChars.charAt(Math.floor(Math.random() * allChars.length))
    }

    return output
  }

  public static generateNumber (length: number): number {
    let output = 0

    output = Math.ceil(Math.random() * Math.pow(10, length))

    return output
  }

}