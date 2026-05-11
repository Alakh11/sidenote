import re
from typing import Dict, List, Tuple

class SplitError(Exception):
    pass

def parse_and_compute_split(amount: float, remaining_text: str, group_members: List[Dict], payer_id: int) -> Tuple[str, str, Dict[str, float]]:
    tokens = remaining_text.lower().split()
    
    desc_tokens = []
    idx = 0
    while idx < len(tokens):
        t = tokens[idx]
        if t.startswith('@') or '%' in t or re.match(r'^\d+(?:\:\d+)+$', t) or t == 'exclude:me':
            break
        desc_tokens.append(t)
        idx += 1
        
    if not desc_tokens:
        raise SplitError("Almost there! What was this expense for? Try: @group_name 500 food ✅")
    
    description = " ".join(desc_tokens).capitalize()
    
    config_tokens = tokens[idx:]
    exclude_self = 'exclude:me' in config_tokens
    if exclude_self:
        config_tokens.remove('exclude:me')
        
    mentions = [t[1:] for t in config_tokens if t.startswith('@')]
    
    member_map = {m['name'].lower().split()[0]: m['id'] for m in group_members}
    member_map.update({m.get('nickname', '').lower(): m['id'] for m in group_members if m.get('nickname')})
    
    mentioned_users = []
    for m in mentions:
        if m == 'me':
            mentioned_users.append(payer_id)
        elif m in member_map:
            mentioned_users.append(member_map[m])
        else:
            raise SplitError(f"@{m} isn't in this group. Check the name and try again.")
            
    mentioned_users = list(dict.fromkeys(mentioned_users))
    
    has_pct = any('%' in t for t in config_tokens)
    has_ratio = any(re.match(r'^\d+(?:\:\d+)+$', t) for t in config_tokens)
    
    shares = {}
    split_type = 'equal'
    
    if has_pct:
        split_type = 'percentage'
        pcts = [float(t.replace('%', '')) for t in config_tokens if '%' in t]
        if sum(pcts) < 99.9 or sum(pcts) > 100.1:
            raise SplitError("Your percentages don't add up to 100% 🧮 Please check and try again.")
        if len(pcts) != len(mentioned_users):
            raise SplitError("I couldn't understand that format. Use: @group_name 1000 food 60% @ravi 40% @priya")
        
        if payer_id not in mentioned_users and not exclude_self:
            raise SplitError("You're not in the split! Either include yourself with a % or add exclude:me at the end.")
            
        for p, uid in zip(pcts, mentioned_users):
            shares[str(uid)] = round((p / 100) * amount, 2)
            
        diff = amount - sum(shares.values())
        if diff != 0 and str(payer_id) in shares:
            shares[str(payer_id)] += diff
            
    elif has_ratio:
        split_type = 'ratio'
        ratio_str = next(t for t in config_tokens if re.match(r'^\d+(?:\:\d+)+$', t))
        parts = [float(p) for p in ratio_str.split(':')]
        
        expected_parts = len(mentioned_users)
        if not exclude_self and payer_id not in mentioned_users:
            expected_parts += 1
            
        if len(parts) != expected_parts:
            raise SplitError("The number of ratio parts doesn't match the number of members. e.g. 2:1:1 needs 3 people.")
            
        total_parts = sum(parts)
        if total_parts == 0:
            raise SplitError("I couldn't understand that format.")
            
        participants = mentioned_users.copy()
        if not exclude_self and payer_id not in participants:
            participants.append(payer_id)
            
        for p, uid in zip(parts, participants):
            shares[str(uid)] = round((p / total_parts) * amount, 2)
            
        diff = amount - sum(shares.values())
        if diff != 0 and str(payer_id) in shares:
            shares[str(payer_id)] += diff
            
    else:
        split_type = 'equal'
        if not mentioned_users:
            participants = [m['id'] for m in group_members]
            if exclude_self and payer_id in participants: 
                participants.remove(payer_id)
        else:
            participants = mentioned_users.copy()
            if not exclude_self and payer_id not in participants:
                participants.append(payer_id)
            elif exclude_self and payer_id in participants:
                participants.remove(payer_id)
                
        if len(participants) < 2 and not mentioned_users:
            raise SplitError("You're the only one here! Add members to the group before splitting.")
            
        share = round(amount / len(participants), 2)
        for uid in participants:
            shares[str(uid)] = share
            
        diff = round(amount - sum(shares.values()), 2)
        if diff != 0:
            if str(payer_id) in shares: 
                shares[str(payer_id)] = round(shares[str(payer_id)] + diff, 2)
            elif participants: 
                shares[str(participants[0])] = round(shares[str(participants[0])] + diff, 2)

    return description, split_type, shares