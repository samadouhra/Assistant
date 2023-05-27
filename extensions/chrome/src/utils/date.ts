export const getCurrentDateYYMMDD = () => {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const day = currentDate.getDate()
    const monthFixed = month < 10 ? `0${month}` : month
    const dayFixed = day < 10 ? `0${day}` : day
    const currentDateYYMMDD = [year, monthFixed, dayFixed].join('/')
    return currentDateYYMMDD
}

export const getCurrentHourHHMM = () => {
    const currentDate = new Date()
    const hour = currentDate.getHours()
    const minutes = currentDate.getMinutes()
    const hourFixed = hour < 10 ? `0${hour}` : hour
    const minutesFixed = minutes < 10 ? `0${minutes}` : minutes
    return `${hourFixed}:${minutesFixed}`
}