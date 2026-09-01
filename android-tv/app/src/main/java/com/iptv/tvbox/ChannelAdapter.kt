package com.iptv.tvbox

import android.graphics.Color
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class ChannelAdapter(
    private val onSelect: (Channel) -> Unit,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
    private val rows = mutableListOf<Row>()
    var selectedId: String? = null
        set(value) {
            field = value
            notifyDataSetChanged()
        }

    sealed class Row {
        data class Header(val title: String) : Row()
        data class Item(val channel: Channel) : Row()
    }

    fun submit(groups: List<Pair<String, List<Channel>>>) {
        rows.clear()
        groups.forEach { (group, items) ->
            rows += Row.Header("$group  ${items.size}")
            items.forEach { rows += Row.Item(it) }
        }
        notifyDataSetChanged()
    }

    fun firstChannel(): Channel? = rows.filterIsInstance<Row.Item>().firstOrNull()?.channel

    override fun getItemViewType(position: Int) = if (rows[position] is Row.Header) 0 else 1
    override fun getItemCount() = rows.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == 0) {
            val view = TextView(parent.context).apply {
                setPadding(24, 18, 24, 8)
                textSize = 13f
                setTextColor(Color.parseColor("#A8A29E"))
            }
            HeaderHolder(view)
        } else {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_channel, parent, false)
            ItemHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val row = rows[position]) {
            is Row.Header -> (holder as HeaderHolder).bind(row.title)
            is Row.Item -> (holder as ItemHolder).bind(row.channel)
        }
    }

    inner class HeaderHolder(private val view: TextView) : RecyclerView.ViewHolder(view) {
        fun bind(title: String) {
            view.text = title
        }
    }

    inner class ItemHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val name = view.findViewById<TextView>(R.id.channelName)
        private val group = view.findViewById<TextView>(R.id.channelGroup)
        private val logo = view.findViewById<ImageView>(R.id.channelLogo)
        private val card = view.findViewById<LinearLayout>(R.id.channelCard)

        fun bind(channel: Channel) {
            name.text = channel.name
            group.text = channel.group
            LogoLoader.bind(logo, channel.logo)
            val selected = channel.id == selectedId
            card.isSelected = selected
            card.setBackgroundColor(
                if (selected) Color.parseColor("#33F59E0B") else Color.TRANSPARENT,
            )
            card.setOnClickListener { onSelect(channel) }
            card.setOnFocusChangeListener { _, hasFocus ->
                card.alpha = if (hasFocus) 1f else 0.92f
                if (hasFocus && !selected) {
                    card.setBackgroundColor(Color.parseColor("#22FFFFFF"))
                } else if (selected) {
                    card.setBackgroundColor(Color.parseColor("#33F59E0B"))
                } else {
                    card.setBackgroundColor(Color.TRANSPARENT)
                }
            }
            card.setOnKeyListener { _, keyCode, event ->
                if (event.action == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
                    onSelect(channel)
                    true
                } else {
                    false
                }
            }
        }
    }
}
