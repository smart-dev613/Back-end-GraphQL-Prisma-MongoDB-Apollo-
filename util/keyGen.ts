export function generatePublisherKey(): Promise<string> {
    return new Promise((resolve, reject) => {
      const key: string =  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
      resolve(key)
    })
  }