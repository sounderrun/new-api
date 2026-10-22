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
import DOMPurify from 'dompurify'
import { t } from 'i18next'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import {
  isUnsafeHtmlUrl,
  shouldOpenLinkInNewTab,
  type ImageNode,
  type LinkNode,
  type TextNode,
} from 'stream-markdown-parser'

import { classifyValue, type FadeRun } from './response-fade'
import { ImagePreviewContext } from './response-image-context'
import { ResponseImage } from './response-renderer-image'
import type { RenderChildren } from './response-types'

const STREAM_FADE_DELAY_VAR = '--stream-fade-delay'

export function renderTextNode(node: TextNode, fadeRun?: FadeRun): ReactNode {
  if (!fadeRun) {
    return node.content
  }

  const segments = classifyValue(fadeRun, node.content)
  if (segments.every((segment) => !segment.animated)) {
    return node.content
  }

  return segments.map((segment) => {
    if (!segment.animated) {
      return <Fragment key={segment.start}>{segment.value}</Fragment>
    }

    const style =
      segment.delay > 0
        ? ({
            [STREAM_FADE_DELAY_VAR]: `${segment.delay}ms`,
          } as CSSProperties)
        : undefined

    return (
      <span data-stream-fade='' key={segment.start} style={style}>
        {segment.value}
      </span>
    )
  })
}

export function renderLink(
  node: LinkNode,
  key: string,
  renderChildren: RenderChildren
): ReactNode {
  const opensInNewTab = shouldOpenLinkInNewTab(node.href)
  const rel = opensInNewTab ? 'noreferrer noopener' : undefined
  const target = opensInNewTab ? '_blank' : undefined

  return (
    <a
      className='text-primary underline-offset-4 hover:underline'
      href={node.href}
      key={key}
      rel={rel}
      target={target}
      title={node.title ?? undefined}
    >
      <ImagePreviewContext.Provider value={false}>
        {renderChildren(node.children)}
      </ImagePreviewContext.Provider>
    </a>
  )
}

export function renderImage(node: ImageNode, key: string): ReactNode {
  return <ResponseImage key={key} node={node} />
}

export function renderVideo(content: string, key: string): ReactNode {
  const fragment = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['video', 'source'],
    ALLOWED_ATTR: ['src', 'loop', 'type'],
    RETURN_DOM_FRAGMENT: true,
  })
  const video = fragment.querySelector('video')
  const src = video?.getAttribute('src') || ''
  const sources = [...(video?.querySelectorAll('source[src]') ?? [])].filter(
    (source) => {
      const url = source.getAttribute('src') || ''
      return url && !isUnsafeHtmlUrl(url, { tagName: 'video', attrName: 'src' })
    }
  )

  if (
    (!src && sources.length === 0) ||
    (src && isUnsafeHtmlUrl(src, { tagName: 'video', attrName: 'src' }))
  ) {
    return <span key={key}>{content}</span>
  }

  return (
    <video
      aria-label={t('Video')}
      className='border-border/70 my-4 block max-h-[60vh] w-full max-w-full rounded-lg border bg-black'
      controls
      key={key}
      loop={video?.hasAttribute('loop')}
      playsInline
      preload='metadata'
      src={src || undefined}
    >
      {sources.map((source) => (
        <source
          key={`${source.getAttribute('src')}:${source.getAttribute('type')}`}
          src={source.getAttribute('src') ?? undefined}
          type={source.getAttribute('type') ?? undefined}
        />
      ))}
    </video>
  )
}
