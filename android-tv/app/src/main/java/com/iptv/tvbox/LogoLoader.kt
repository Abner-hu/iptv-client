package com.iptv.tvbox

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

object LogoLoader {
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newFixedThreadPool(4)
    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()
    private val memory = object : LruCache<String, Bitmap>(12 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }

    fun bind(view: ImageView, url: String?) {
        view.setImageResource(R.drawable.ic_channel_default)
        val target = url?.trim().orEmpty()
        view.tag = target
        if (target.isEmpty() || !(target.startsWith("http://") || target.startsWith("https://"))) {
            return
        }
        memory.get(target)?.let { cached ->
            view.setImageBitmap(cached)
            return
        }
        io.execute {
            val bitmap = fetch(target) ?: return@execute
            memory.put(target, bitmap)
            main.post {
                if (view.tag == target) {
                    view.setImageBitmap(bitmap)
                }
            }
        }
    }

    private fun fetch(url: String): Bitmap? {
        return try {
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "Mozilla/5.0 IPTV-Client")
                .header("Accept", "image/*")
                .build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val bytes = response.body?.bytes() ?: return null
                decode(bytes)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun decode(bytes: ByteArray): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        val longest = maxOf(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
        val options = BitmapFactory.Options().apply {
            inSampleSize = (longest / 128).coerceAtLeast(1)
        }
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
    }
}
