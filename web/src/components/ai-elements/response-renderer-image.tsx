/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sanitizeImageSrc, type ImageNode } from 'stream-markdown-parser'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'

import { ImagePreviewContext } from './response-image-context'

type ResponseImageProps = {
  node: ImageNode
}

export function ResponseImage(props: ResponseImageProps) {
  const { t } = useTranslation()
  const preview = useContext(ImagePreviewContext)
  const [hasError, setHasError] = useState(false)
  const src = sanitizeImageSrc(props.node.src)

  if (!src || hasError) {
    return (
      <span className='border-border/70 text-muted-foreground my-4 inline-flex rounded-md border px-3 py-2 text-xs italic'>
        {props.node.alt || t('Image not available')}
      </span>
    )
  }

  const image = (
    <img
      alt={props.node.alt}
      className='border-border/70 my-4 block h-auto max-h-96 max-w-full rounded-lg border object-contain'
      loading='lazy'
      onError={() => setHasError(true)}
      src={src}
      title={props.node.title ?? undefined}
    />
  )

  if (!preview) return image

  return (
    <Dialog
      title={t('Image Preview')}
      description={t('View the generated image')}
      headerClassName='sr-only'
      contentClassName='max-w-[calc(100vw-2rem)] gap-0 sm:max-w-[calc(100vw-4rem)]'
      bodyClassName='flex items-center justify-center'
      trigger={
        <Button
          aria-label={t('Image Preview')}
          variant='ghost'
          className='block h-auto max-w-full cursor-zoom-in p-0 hover:bg-transparent'
        >
          {image}
        </Button>
      }
    >
      <img
        alt={props.node.alt}
        className='max-h-[calc(100dvh-6rem)] w-full object-contain'
        onError={() => setHasError(true)}
        src={src}
      />
    </Dialog>
  )
}
