from typing import Optional
from whatsapp_service import send_whatsapp_text, get_whatsapp_media_url, download_whatsapp_media
from ai_service import extract_receipt_data, extract_voice_data
from constants import CMD_MENU, CMD_UNDO, CMD_SUMMARY, CMD_WEEK, CMD_MONTH, CMD_TODAY, CMD_MORE, CMD_HELP, CMD_SET_BUDGET, INCOME_KEYWORDS
from whatsapp_handlers.search_handlers import handle_search_command, handle_search_interactive

from whatsapp_handlers.bot_utils import is_duplicate, extract_transaction_details, log_bot_command, ensure_user_exists
from whatsapp_handlers.reports import handle_summary_request, handle_weekly_request, handle_monthly_request, handle_today_request, handle_menu_request, handle_more_request, handle_dashboard_request
from whatsapp_handlers.transactions import handle_transaction_entry, handle_undo_request, handle_undo_action, handle_budget_set, handle_dynamic_replies, handle_fallback

async def process_whatsapp_text(phone: str, text: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    is_new = await ensure_user_exists(phone, sender_name)
    text = text.strip().lower()
    
    if is_new and text in ['hi', 'hello', 'hey', 'start', 'begin', 'good morning', 'good evening', 'good afternoon', 'good night', 'good day', 'morning', 'evening', 'afternoon', 'night', 'day']:
        return
        
    if text == CMD_MENU: log_bot_command(phone, 'menu'); await handle_menu_request(phone)
    elif text == CMD_UNDO: log_bot_command(phone, 'undo'); await handle_undo_request(phone)
    elif text == CMD_SUMMARY: log_bot_command(phone, 'summary'); await handle_summary_request(phone)
    elif text == CMD_WEEK: log_bot_command(phone, 'week'); await handle_weekly_request(phone)
    elif text == CMD_MONTH: log_bot_command(phone, 'month'); await handle_monthly_request(phone)
    elif text == CMD_TODAY: log_bot_command(phone, 'today'); await handle_today_request(phone)
    elif text == CMD_MORE: log_bot_command(phone, 'more'); await handle_more_request(phone)
    elif text == CMD_HELP: 
        log_bot_command(phone, 'help')
        await send_whatsapp_text(phone, "💡 *Tips:*\n- Type `100 food` to add an expense.\n- Type `undo` to delete a mistake.\n- Send a photo of a receipt!\n- Send a Voice Note!")
    elif text.startswith("search ") or text.startswith("find "): 
        log_bot_command(phone, 'search')
        await handle_search_command(phone, text)
    elif text.startswith(CMD_SET_BUDGET): 
        log_bot_command(phone, 'set_budget')
        await handle_budget_set(phone, text)
    else:
        if '\n' in text:
            lines = text.split('\n')
            added_count = 0
            total_expense = 0.0
            total_income = 0.0
            failed_lines = []
            
            for line in lines:
                if not line.strip(): continue
                amount, item, explicit_inc, p_mode = extract_transaction_details(line)
                
                if amount is not None:
                    is_saved = await handle_transaction_entry(phone, amount, item, silent=True, sender_name=sender_name, explicit_income=explicit_inc, payment_mode=p_mode)
                    if is_saved:
                        if explicit_inc or any(keyword in item.lower() for keyword in INCOME_KEYWORDS):
                            total_income += amount
                        else:
                            total_expense += amount
                        added_count += 1
                    else:
                        failed_lines.append(line)
                else:
                    failed_lines.append(line)
                    
            if added_count > 0 or failed_lines:
                summary_msg = ""
                if added_count > 0:
                    summary_msg += f"✅ Saved {added_count} entries!"
                    if total_expense > 0: summary_msg += f"\n💸 Total Expense: ₹{total_expense:g}"
                    if total_income > 0: summary_msg += f"\n💰 Total Income: ₹{total_income:g}"
                
                if failed_lines:
                    summary_msg += "\n\n❌ *Failed to log these lines:* \n" + "\n".join([f"- {fl}" for fl in failed_lines]) + "\n\n_(Make sure they contain a valid number!)_"
                    
                await send_whatsapp_text(phone, summary_msg.strip())
            else:
                if not await handle_dynamic_replies(phone, text):
                    await handle_fallback(phone, text)
                
        else:
            amount, item, explicit_inc, p_mode = extract_transaction_details(text)
            
            if amount is not None:
                await handle_transaction_entry(phone, amount, item, sender_name=sender_name, explicit_income=explicit_inc, payment_mode=p_mode)
            else:
                if not await handle_dynamic_replies(phone, text):
                    await handle_fallback(phone, text)

async def process_whatsapp_image(phone: str, media_id: str, mime_type: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    await ensure_user_exists(phone, sender_name)
    await send_whatsapp_text(phone, "⏳ Reading your receipt ...")
    
    media_url = await get_whatsapp_media_url(media_id)
    if not media_url: return
    
    image_bytes = await download_whatsapp_media(media_url)
    if not image_bytes: return
    
    receipt_data = extract_receipt_data(image_bytes, mime_type)
    
    if receipt_data and 'amount' in receipt_data and 'item' in receipt_data:
        amount = float(receipt_data['amount'])
        item = str(receipt_data['item'])
        print(f"🤖 AI Successfully Extracted: ₹{amount} for {item}")
        await handle_transaction_entry(phone, amount, item, sender_name=sender_name)
    else:
        await send_whatsapp_text(phone, "❌ Sorry, I couldn't clearly read that receipt.")

async def process_whatsapp_audio(phone: str, media_id: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    await ensure_user_exists(phone, sender_name)
    await send_whatsapp_text(phone, "🎧 Listening to your voice note...")
    
    media_url = await get_whatsapp_media_url(media_id)
    if not media_url: return
    
    audio_bytes = await download_whatsapp_media(media_url)
    if not audio_bytes: return
    
    voice_data = extract_voice_data(audio_bytes, "audio/ogg")
    
    if voice_data and voice_data.get('amount', 0) > 0:
        amount = float(voice_data['amount'])
        item = str(voice_data['item'])
        print(f"🎙️ Voice Extracted: ₹{amount} for {item}")
        await handle_transaction_entry(phone, amount, item, sender_name=sender_name)
    else:
        await send_whatsapp_text(phone, "❓ I couldn't hear a specific amount or item. Could you try speaking a bit clearer?")   

async def process_whatsapp_interactive(phone: str, button_id: str, message_id: Optional[str] = None, sender_name: str = "WhatsApp User"):
    if is_duplicate(message_id): return
    
    await ensure_user_exists(phone, sender_name)
    if button_id == "cmd_summary": log_bot_command(phone, 'summary'); await handle_summary_request(phone)
    elif button_id == "cmd_today": log_bot_command(phone, 'today'); await handle_today_request(phone)
    elif button_id == "cmd_more": log_bot_command(phone, 'more'); await handle_more_request(phone)
    elif button_id == "cmd_dashboard": log_bot_command(phone, 'dashboard'); await handle_dashboard_request(phone)
    elif button_id == "cmd_month": log_bot_command(phone, 'month'); await handle_monthly_request(phone)
    elif button_id == "cmd_week": log_bot_command(phone, 'week'); await handle_weekly_request(phone)
    elif button_id == "cmd_help": 
        log_bot_command(phone, 'help')
        await send_whatsapp_text(phone, "💡 *Tips:*\n- Type `100 food` to add an expense.\n- Type `undo` to delete a mistake.\n- Send a photo of a receipt!")
    elif button_id.startswith("del_"):
        tx_id = int(button_id.split("_")[1])
        log_bot_command(phone, 'undo')
        await handle_undo_action(phone, tx_id)
    elif button_id.startswith("srch_cat_"):
        log_bot_command(phone, 'search_pagination')
        await handle_search_interactive(phone, button_id)
    else:
        await handle_dynamic_replies(phone, button_id)