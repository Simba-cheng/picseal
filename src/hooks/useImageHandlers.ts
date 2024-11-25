import type { RcFile } from 'antd/es/upload'

import type { ExifParamsForm } from '../types'
import { message } from 'antd'
import domtoimage from 'dom-to-image'
import { useRef, useState } from 'react'
import { getBrandUrl } from '../utils/BrandUtils'
import { getRandomImage, parseExifData } from '../utils/ImageUtils'
import { get_exif } from '../wasm/gen_brand_photo_pictrue'

export function useImageHandlers(formRef: any, initialFormValue: ExifParamsForm) {
  const [formValue, setFormValue] = useState<ExifParamsForm>(initialFormValue)
  const [imgUrl, setImgUrl] = useState<string>(getRandomImage())
  const imgRef = useRef<HTMLImageElement>(null)

  // 处理文件上传
  const handleAdd = (file: RcFile): false => {
    const reader = new FileReader()
    reader.onloadend = async (e) => {
      try {
        const exifData = get_exif(new Uint8Array(e.target.result))
        const parsedExif = parseExifData(exifData)
        const updatedFormValue = {
          ...formValue,
          ...parsedExif,
          brand_url: getBrandUrl(parsedExif.brand), // Use getBrandUrl from utils
        }
        console.log('original EXIF data: ', exifData)
        console.log('parsed EXIF data: ', parsedExif)
        formRef.current.setFieldsValue(updatedFormValue)
        setFormValue(updatedFormValue)
        setImgUrl(URL.createObjectURL(new Blob([file], { type: file.type })))
      }
      catch (error) {
        console.error('Error parsing EXIF data:', error)
        message.error('无法识别照片特定数据，请换一张照片', 300)
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  // 导出图片
  const handleDownload = (): void => {
    const previewDom = document.getElementById('preview')
    const zoomRatio = 4

    domtoimage
      .toJpeg(previewDom, {
        quality: 1.0,
        width: previewDom.clientWidth * zoomRatio,
        height: previewDom.clientHeight * zoomRatio,
        style: { transform: `scale(${zoomRatio})`, transformOrigin: 'top left' },
      })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = `${Date.now()}.jpg`
        link.href = dataUrl
        document.body.appendChild(link)
        link.click()
        link.remove()
      })
      .catch((err) => {
        console.error('Export Error:', err)
        message.error('导出失败，请重试')
      })
  }

  // 处理表单更新
  const handleFormChange = (_: any, values: ExifParamsForm): void => {
    setFormValue({
      ...values,
      brand_url: getBrandUrl(values.brand),
    })
  }

  const handleScaleChange = (scale) => {
    document.documentElement.style.setProperty('--banner-scale', scale)
    setFormValue(prev => ({ ...prev, scale }))
  }

  const handleFontSizeChange = (fontSize) => {
    const sizeMap = {
      small: 'var(--font-size-small)',
      normal: 'var(--font-size-normal)',
      large: 'var(--font-size-large)',
    }
    document.documentElement.style.setProperty('--current-font-size', sizeMap[fontSize])
    setFormValue(prev => ({ ...prev, fontSize }))
  }

  const handleFontWeightChange = (fontWeight) => {
    const weightMap = {
      normal: 'var(--font-weight-normal)',
      bold: 'var(--font-weight-bold)',
      black: 'var(--font-weight-black)',
    }
    document.documentElement.style.setProperty('--current-font-weight', weightMap[fontWeight])
    setFormValue(prev => ({ ...prev, fontWeight }))
  }

  const handleFontFamilyChange = (fontFamily) => {
    const familyMap = {
      default: 'var(--font-family-default)',
      caveat: 'var(--font-family-caveat)',
      misans: 'var(--font-family-misans)',
      helvetica: 'var(--font-family-helvetica)',
      futura: 'var(--font-family-futura)',
      avenir: 'var(--font-family-avenir)',
      didot: 'var(--font-family-didot)',
    }
    document.documentElement.style.setProperty('--current-font-family', familyMap[fontFamily])
    setFormValue(prev => ({ ...prev, fontFamily }))
  }

  // 更新处理展览按钮点击的函数
  const handleExhibitionClick = async (brand: string) => {
    const brandImageUrl = `./exhibition/${brand.toLowerCase()}.jpg`

    // Add fade class to trigger animation
    if (imgRef.current) {
      imgRef.current.classList.add('fade')
    }

    // Wait for the fade effect to complete before changing the image
    setTimeout(async () => {
      setImgUrl(brandImageUrl)

      // Read image file and parse EXIF data
      const response = await fetch(brandImageUrl)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const exifData = get_exif(new Uint8Array(arrayBuffer))
      const parsedExif = parseExifData(exifData)

      const updatedFormValue = {
        ...formValue,
        ...parsedExif,
        brand_url: getBrandUrl(parsedExif.brand),
      }

      formRef.current.setFieldsValue(updatedFormValue)
      setFormValue(updatedFormValue)

      // Remove fade class after the new image is set
      if (imgRef.current) {
        imgRef.current.classList.remove('fade')
        imgRef.current.classList.add('loaded') // Ensure the loaded class is added
      }
    }, 500) // Match the duration of the CSS transition
  }

  return {
    imgRef,
    imgUrl,
    setImgUrl,
    formValue,
    setFormValue,
    handleAdd,
    handleDownload,
    handleFormChange,
    handleFontSizeChange,
    handleFontWeightChange,
    handleFontFamilyChange,
    handleScaleChange,
    handleExhibitionClick,
  }
}
