const twoDigit = (num: any) => {
    if(num !== undefined) {
        if(num < 10)
            return '0' + num;
        else
            return num.toString();
    }
    else
        return "";
}

export const convertToUKDate = (date: any) => {
    const dateObject = new Date(date);
    const formattedStr: string =
        twoDigit(dateObject.getHours()) + ':' +
        twoDigit(dateObject.getMinutes()) + ' ' +
        twoDigit(dateObject.getDate()) + '/' +
        twoDigit(dateObject.getMonth() + 1) + '/' +
        dateObject.getFullYear()
    ;
    return formattedStr;
}
