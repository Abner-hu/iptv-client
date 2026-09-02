package com.iptv.tvbox

import android.graphics.Color
import android.graphics.Typeface
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class ImportSourceAdapter(
    private val items: List<KnownPlaylist>,
    private val checked: BooleanArray,
) : RecyclerView.Adapter<ImportSourceAdapter.Holder>() {

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_import, parent, false)
        return Holder(view)
    }

    override fun onBindViewHolder(holder: Holder, position: Int) {
        holder.bind(position)
    }

    inner class Holder(view: View) : RecyclerView.ViewHolder(view) {
        private val row = view.findViewById<LinearLayout>(R.id.importRow)
        private val mark = view.findViewById<TextView>(R.id.importCheck)
        private val name = view.findViewById<TextView>(R.id.importName)
        private val meta = view.findViewById<TextView>(R.id.importMeta)
        private val badge = view.findViewById<TextView>(R.id.importBadge)

        fun bind(index: Int) {
            val item = items[index]
            name.text = item.name
            meta.text = "${item.region}  ·  ${item.description}"
            paint(row.isFocused)
            row.setOnFocusChangeListener { _, hasFocus -> paint(hasFocus) }
            row.setOnClickListener {
                checked[index] = !checked[index]
                paint(row.isFocused)
            }
            row.setOnKeyListener { _, keyCode, event ->
                if (event.action == KeyEvent.ACTION_DOWN &&
                    (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER)
                ) {
                    row.performClick()
                    true
                } else {
                    false
                }
            }
        }

        private fun paint(focused: Boolean) {
            val index = bindingAdapterPosition
            if (index == RecyclerView.NO_POSITION) return
            val on = checked[index]
            if (on) {
                mark.text = "✓"
                mark.setBackgroundColor(DARK)
                mark.setTextColor(AMBER)
                badge.visibility = View.VISIBLE
                row.setBackgroundColor(if (focused) AMBER else AMBER_DIM)
                name.setTextColor(DARK)
                name.setTypeface(Typeface.DEFAULT_BOLD)
                meta.setTextColor(DARK_MUTED)
                badge.setTextColor(DARK)
                badge.setBackgroundColor(CREAM)
            } else {
                mark.text = ""
                mark.setBackgroundColor(if (focused) GRAY_LIGHT else GRAY)
                badge.visibility = View.GONE
                row.setBackgroundColor(if (focused) ROW_FOCUS else ROW_OFF)
                name.setTextColor(if (focused) WHITE else OFF_TEXT)
                name.setTypeface(Typeface.DEFAULT)
                meta.setTextColor(META)
            }
        }
    }

    companion object {
        private const val DARK = 0xFF1C1917.toInt()
        private const val DARK_MUTED = 0xFF44403C.toInt()
        private const val AMBER = 0xFFFBBF24.toInt()
        private const val AMBER_DIM = 0xFFD97706.toInt()
        private const val CREAM = 0xFFFEF3C7.toInt()
        private const val WHITE = 0xFFF5F5F4.toInt()
        private const val OFF_TEXT = 0xFFD6D3D1.toInt()
        private const val META = 0xFFA8A29E.toInt()
        private const val GRAY = 0xFF44403C.toInt()
        private const val GRAY_LIGHT = 0xFF78716C.toInt()
        private const val ROW_OFF = 0xFF292524.toInt()
        private const val ROW_FOCUS = 0xFF57534E.toInt()
    }
}
