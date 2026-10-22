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
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Response } from '../response'
import {
  FADE_DURATION_MS,
  FADE_HYDRATION_THRESHOLD,
  FADE_STAGGER_MAX_MS,
} from '../response-fade'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Response video playback', () => {
  const url = 'http://127.0.0.1:8100/files/flow_3fcf42921a.mp4'

  test('embeds the generated video and keeps its download link', () => {
    render(
      <Response>
        {`<video src='${url}' controls autoplay loop width='100%'></video>\n\n[Download Video](${url})`}
      </Response>
    )

    const video = screen.getByLabelText('Video')
    expect(video.tagName).toBe('VIDEO')
    expect(video).toHaveAttribute('src', url)
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).not.toHaveAttribute('autoplay')
    expect(
      screen.getByRole('link', { name: 'Download Video' })
    ).toHaveAttribute('href', url)
  })

  test('embeds a multiline video with a source child and decodes its URL', () => {
    render(
      <Response>
        {
          '<video controls>\n<source src="https://example.com/video.mp4?a=1&amp;b=2" type="video/mp4">\n</video>'
        }
      </Response>
    )

    expect(
      screen.getByLabelText('Video').querySelector('source')
    ).toHaveAttribute('src', 'https://example.com/video.mp4?a=1&b=2')
  })

  test('preserves alternative source formats for native codec fallback', () => {
    render(
      <Response>
        {
          '<video controls>\n<source src="https://example.com/video.webm" type="video/webm">\n<source src="https://example.com/video.mp4" type="video/mp4">\n</video>'
        }
      </Response>
    )
    const video = screen.getByLabelText('Video')
    expect(video).not.toHaveAttribute('src')
    const sources = video.querySelectorAll('source')
    expect(sources).toHaveLength(2)
    expect(sources[0]).toHaveAttribute('type', 'video/webm')
    expect(sources[1]).toHaveAttribute('type', 'video/mp4')
    expect(sources[1]).toHaveAttribute('src', 'https://example.com/video.mp4')
  })

  test.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///video.mp4',
  ])('does not embed an unsafe video URL: %s', (src) => {
    render(<Response>{`<video src="${src}"></video>`}</Response>)
    expect(screen.queryByLabelText('Video')).not.toBeInTheDocument()
  })

  test('does not copy executable attributes or nested HTML into the player', () => {
    const { container } = render(
      <Response>
        {`<video src="${url}" onerror="alert(1)" style="position:fixed"><script>alert(1)</script><iframe src="https://example.com"></iframe></video>`}
      </Response>
    )

    expect(screen.getByLabelText('Video')).toHaveAttribute('src', url)
    expect(screen.getByLabelText('Video')).not.toHaveAttribute('onerror')
    expect(screen.getByLabelText('Video')).not.toHaveAttribute('style')
    expect(container.querySelector('script, iframe')).toBeNull()
  })

  test('keeps video markup in a code example as code', () => {
    render(
      <Response>{`\`\`\`html\n<video src="${url}"></video>\n\`\`\``}</Response>
    )
    expect(screen.queryByLabelText('Video')).not.toBeInTheDocument()
  })

  test('renders streamed video markup after its source arrives', () => {
    const { rerender } = render(
      <Response parserId='video-stream-test' final={false}>
        {'<video src="'}
      </Response>
    )
    expect(screen.queryByLabelText('Video')).not.toBeInTheDocument()

    rerender(
      <Response parserId='video-stream-test' final={false}>
        {`<video src="${url}">`}
      </Response>
    )
    expect(screen.queryByLabelText('Video')).not.toBeInTheDocument()

    rerender(
      <Response parserId='video-stream-test' final={false}>
        {`<video src="${url}"></video>`}
      </Response>
    )
    const video = screen.getByLabelText<HTMLVideoElement>('Video')
    video.currentTime = 7

    rerender(
      <Response parserId='video-stream-test' final>
        {`<video src="${url}"></video>\n\n[Download Video](${url})`}
      </Response>
    )
    expect(screen.getByLabelText('Video')).toBe(video)
    expect(video.currentTime).toBe(7)
  })
})

describe('Response image preview', () => {
  test.each(['', '*', '**', '~~'])(
    'preserves linked image navigation inside %s formatting',
    (format) => {
      render(
        <Response>
          {`[${format}![Linked portrait](https://example.com/portrait.png)${format}](https://example.com/original)`}
        </Response>
      )
      const link = screen.getByRole('link', { name: 'Linked portrait' })
      expect(link).toHaveAttribute('href', 'https://example.com/original')
      expect(within(link).getByRole('img')).toHaveAttribute(
        'src',
        'https://example.com/portrait.png'
      )
      expect(within(link).queryByRole('button')).not.toBeInTheDocument()
    }
  )

  test('opens the original image and restores focus when dismissed with Escape or Close', async () => {
    const user = userEvent.setup()
    render(
      <Response>
        ![Generated portrait](https://example.com/portrait.png)
      </Response>
    )
    const trigger = screen.getByRole('button', { name: 'Image Preview' })

    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Image Preview' })
    expect(
      within(dialog).getByRole('img', { name: 'Generated portrait' })
    ).toHaveAttribute('src', 'https://example.com/portrait.png')

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(trigger).toHaveFocus()

    await user.keyboard('{Enter}')
    const reopened = await screen.findByRole('dialog', {
      name: 'Image Preview',
    })
    await user.click(within(reopened).getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(trigger).toHaveFocus()
  })

  test('retains the unavailable-image fallback without an empty preview', () => {
    render(
      <Response>![Missing portrait](https://example.com/missing.png)</Response>
    )
    fireEvent.error(screen.getByRole('img', { name: 'Missing portrait' }))
    expect(screen.getByText('Missing portrait')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Image Preview' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Response streaming fade', () => {
  test('wraps newly streamed words when final is false', () => {
    const { rerender } = render(<Response final={false}>Hello</Response>)

    expect(
      document.querySelectorAll('[data-stream-fade]').length
    ).toBeGreaterThan(0)
    expect(screen.getByText('Hello')).toBeTruthy()

    rerender(<Response final={false}>Hello world</Response>)

    const fades = [...document.querySelectorAll('[data-stream-fade]')]
    expect(fades.some((node) => node.textContent === 'world')).toBe(true)
  })

  test('renders settled content with zero fade wrappers when final is true', () => {
    render(<Response final>Hello world</Response>)

    expect(document.querySelectorAll('[data-stream-fade]')).toHaveLength(0)
    expect(screen.getByText(/Hello world/)).toBeTruthy()
  })

  test('does not fade inline code or fenced code blocks', () => {
    render(
      <Response final={false}>
        {['Use `code` and:', '', '```', 'block', '```'].join('\n')}
      </Response>
    )

    const fades = [...document.querySelectorAll('[data-stream-fade]')]
    const fadedText = fades.map((node) => node.textContent ?? '').join('')
    expect(fadedText.includes('block')).toBe(false)
    expect(
      fades.every((node) => {
        const text = node.textContent ?? ''
        return text.trim() !== 'code' && text.trim() !== 'block'
      })
    ).toBe(true)
  })

  test('does not re-animate words after markdown restructuring around strong', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    const { rerender } = render(<Response final={false}>**fin</Response>)
    expect(
      document.querySelectorAll('[data-stream-fade]').length
    ).toBeGreaterThan(0)

    vi.spyOn(performance, 'now').mockReturnValue(
      1000 + FADE_DURATION_MS + FADE_STAGGER_MAX_MS + 1
    )
    rerender(<Response final={false}>**final**</Response>)

    const strong = document.querySelector('strong')
    expect(strong?.textContent).toContain('final')

    const fades = [...document.querySelectorAll('[data-stream-fade]')]
    expect(
      fades.every((node) => !(node.textContent ?? '').includes('final'))
    ).toBe(true)
  })

  test('suppresses fades on the first streaming render of hydrated content', () => {
    const hydrated = 'word '.repeat(FADE_HYDRATION_THRESHOLD)

    render(<Response final={false}>{hydrated}</Response>)

    expect(document.querySelectorAll('[data-stream-fade]')).toHaveLength(0)
  })

  test('drops all fade wrappers once the stream settles', () => {
    const { rerender } = render(
      <Response final={false}>Streaming text</Response>
    )
    expect(
      document.querySelectorAll('[data-stream-fade]').length
    ).toBeGreaterThan(0)

    rerender(<Response final>Streaming text</Response>)
    expect(document.querySelectorAll('[data-stream-fade]')).toHaveLength(0)
  })
})
