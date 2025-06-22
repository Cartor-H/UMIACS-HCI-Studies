import re
import openai
import asyncio
import pandas as pd
import time

async_client = openai.AsyncOpenAI()

# classification_prompt = """
# Classify a user message into one of the following categories with the following steps: (1) for each category, let's think step by step if the question aligns with the definition and examples of this category, and (2) provide a label for the category this question falls under. You must make a decision among all categories. Please append a special token "Category: " before you output your final category.
#
# Category list:
#
# 1. Word explanation: this category focuses on lexical explanations of words and phrases that appear in the given news, without going into the implications or the specific issues relevant to the word.
#
# Example messages: "What is the meaning of constitution?", "glut meaning", "pragmatic meaning"
#
# 2. Text summary: this category focuses on a concise representation of selected text from the news article, without going into synthesis of the article.
#
# Example questions: "Can you briefly summarize this news?", "Summarize this article so i can explain to someone", "Go ahead and give me a brief summary of this article."
#
# 3. Viewpoint synthesis: this category focuses on an integration of insights and perspectives for explanations on an specific issue conveyed in the news.
#
# Example messages: "Why is housing growth slow?", "why is home construction taking so long to complete?", "Does federal rent control seem like it would be a valid plan or actually work?"
#
# 4. Referential fact: this category focuses on factual information related to the content mentioned in the news but require external sources for further details.
#
# Example messages: "What is the year-to-year rent in Arlington, VA?", "Did Virginia law H.B. 2441 pass the legislator?", "How does this compare to other states?"
#
# 5. Broader impact: this category focuses on societal effects or consequences related to the issues reported in the news but go beyond its explicit content.
#
# Example messages: "How does Joe Biden's Renters Bill of Rights affect non-subsidized housing?", "How has COVID-19 affected home prices in Virginia?", "How does this affect home prices?"
#
# 6. Practical guidance: this category focuses on recommendations or advice that encourage specific behaviors of the news reader but go beyond what this news has explicitly discussed.
#
# Example messages: "I am a renter in VA, what should I be paying attention to and what advice can you give?", "Is it smart for people to move to the West coast right now?", "When should someone file a tenant's assertion?"
#
# 7. Conversational: this category focuses on the user's conversation with you, e.g., to ask for clarification, to indicate they do not understand you, or to request a way of speaking from you.
#
# Example questions: "Answer from this page instead", "Are you aware of the article to my left?",  "thank you"
#
# Here is an example:
# Categorize this message: Answer from this page instead
# Step 1: Evaluating against **Word Explanation**
# - The message does not request the definition of a word or phrase.
# - **Not a match.**
#
# Step 2: Evaluating against **Text Summary**
# - The message does not ask for a summary of an article.
# - **Not a match.**
#
# Step 3: Evaluating against **Viewpoint Synthesis**
# - The message does not ask for an integration of perspectives or explanations on an issue.
# - **Not a match.**
#
# Step 4: Evaluating against **Referential Fact**
# - The message does not seek external factual information related to the news.
# - **Not a match.**
#
# Step 5: Evaluating against **Broader Impact**
# - The message does not inquire about societal consequences or effects beyond the explicit news content.
# - **Not a match.**
#
# Step 6: Evaluating against **Practical Guidance**
# - The message does not seek advice or recommendations.
# - **Not a match.**
#
# Step 7: Evaluating against **Conversational**
# - The message is engaging in conversation, requesting the assistant to refer to a specific source for its response.
# - This aligns with the **Conversational** category.
# - **Match.**
#
# Final Decision:
# **Category: Conversational**
#
# Your task:
# Categorize this message: <message>
# """


# classification_prompt = """
# Learn the definition of these categories. Then follow my reasoning approach to classify user messages.
# Definitions of categories:
# 1. Word explanation: this category focuses on lexical explanations of words and phrases that appear in the given news, without going into the implications or the specific issues relevant to the word.
# 2. Text summary: this category focuses on a concise representation of selected text from the news article, without going into synthesis of the article.
# 3. Viewpoint synthesis: this category focuses on an integration of insights and perspectives for explanations on an specific issue conveyed in the news.
# 4. Referential fact: this category focuses on factual information related to the content mentioned in the news but require external sources for further details.
# 5. Broader impact: this category focuses on societal effects or consequences related to the issues reported in the news but go beyond its explicit content.
# 6. Practical guidance: this category focuses on recommendations or advice that encourage specific behaviors of the news reader but go beyond what this news has explicitly discussed.
# 7. Conversational: this category focuses on the user's conversation with you, e.g., to ask for clarification, to indicate they do not understand you, or to request a way of speaking from you.
#
# Examples and my approach to classifying them:
# Message: "What is the meaning of constitution?"
# Reasoning: User asks to explain the meaning of the word "constitution". Responding to this message requires me to provide an explanation of this word. This is word explanation.
# Category: Word explanation
# Message: "glut meaning"
# Reasoning: User asks to explain the meaning of the word "glut". Responding to this message requires me to provide an explanation to this word. This is word explanation.
# Category: Word explanation
# Message: "Can you briefly summarize this news?"
# Reasoning: User asks to summarize the news. Responding to this message requires me to generate a concise representation of the news content. This is text summary.
# Category: Text summary
# Message: "Summarize this article so i can explain to someone"
# Reasoning: User asks to summarize the news. Responding to this message requires me to generate a concise representation of the news content. This is text summary.
# Category: Text summary
# Message: "Why is housing growth slow?"
# Reasoning: User requests explanation of the slow housing growth rate. Responding to this message requires me to synthesize various perspectives and insights in the news article about house growth in the U.S. to come up with an explanation. This is viewpoint synthesis.
# Category: Viewpoint synthesis
# Message:"why is home construction taking so long to complete?"
# Reasoning: User requests explanation of the long timeline for home construction. Responding to this message requires me to synthesize various perspectives and insights in the news article about home construction issues to come up with an explanation. This is viewpoint synthesis.
# Category: Viewpoint synthesis
# Message: "What is the year-to-year rent in Arlington, VA?"
# Reasoning: User requests factual information about year-to-year rent in Arlington, VA. Responding to this message requires me to look up the year-to-year rent in this region to provide it to user. This is referential fact.
# Category: Referential fact
# Message: "Did Virginia law H.B. 2441 pass the legislator?"
# Reasoning: User requests factual information about Virginia law H.B. 2441. Responding to this message requires me to look up the status of this law to provide it to user. This is referential fact.
# Category: Referential fact
# Message: "How does Joe Biden's Renters Bill of Rights affect non-subsidized housing?"
# Reasoning: User asks the impact of Renters Bill of Rights on non-subsidized housing. Responding to this message requires me to analyze the impact of this bill. This is broader impact.
# Category: Broader impact
# Message: "How has COVID-19 affected home prices in Virginia?"
# Reasoning: User asks the impact of COVID-19 on home prices in Virginia. Responding to this message requires me to analyze the impact of COVID-19 relevant to home prices. This is broader impact.
# Category: Broader impact
# Message:"I am a renter in VA, what should I be paying attention to and what advice can you give?"
# Reasoning: User asks guidance for their own actions. Responding to this message requires me to offer personalized advice based on user's own background about what they should do in light of the news content. This is practical guidance.
# Category: Practical guidance
# Message:"Is it smart for people to move to the West coast right now?"
# Reasoning: User asks guidance on whether the choice to move to West Coast is reasonable. Responding to this message requires me to offer advice about this planned action. This is practical guidance.
# Category: Practical guidance
# Message: "Answer from this page instead"
# Reasoning: User asks me revise my answer by using content from this page. Responding to this message requires me to change the way I provide response. This is conversational.
# Category: Conversational
# Message: "thank you"
# Reasoning: User acknowledges my response to them. Responding to this message requires me to offer a social acknowledge such as "you are welcome". This is conversational.
# Category: Conversational
# Message: "<message>"
# """

N1_news = """"I do think we've seen the peak rent price for 2023," Danielle Hale, Realtor.com chief economist, told Yahoo Finance Live.
For the third consecutive month, asking rent prices — or vacant units advertised by landlords — have fallen, declining 1% over the same period a year ago, according to Realtor.com’s Mid-year rental report.
"We're at the point in the season where we typically see rents decline. And rents are down from a year ago as they have been for the past few months and so that means we are likely to see that 2022 was the peak for rents. And we're starting to see some decline," Hale added.
The big reason for the slowdown: more housing. In the past three years, builders have added 1.2 million apartments to the market, with 2023 shaping up to be a peak year as developers expect to open 460,860 rentals by year-end, according to RentCafe's construction report.
"While the time-to-completion on multifamily properties is much longer than single-family homes, in our view this glut of multifamily supply will eventually suppress apartment rent growth," Vinay Viswanathan, a fixed income strategist at Goldman Sachs, wrote in a note for the firm's housing team.
But new financing challenges are emerging that could threaten the supply — and rental price — outlook beyond next year.
Already, West Coast metro areas are facing an apartment construction slump.
Data from CoStar Group shows developers are on pace to build less than 32,000 apartments in Los Angeles, San Francisco, San Diego, San Jose, Seattle, and Portland this year — marking a roughly 20% drop compared with 2021 levels.
"It's the worst thing that could be happening," Jay Lybik, national director of multifamily analytics at CoStar Group, said in a statement. "The region still doesn't have enough housing."
So far this year has been the slowest for the West Coast, developing less than half as many apartments as the first two quarters of 2021. The tally hit 10,687 in 2023. That falls short of the 19,434 starts recorded in the first half of 2021.
A memo from a Los Angeles project’s development team revealed in June that it wanted to reduce the project’s total units and commercial space in response to "rising construction costs and the increasingly uncertain climate for capital sources to fund the project."
But the lack of construction could become a bigger problem nationwide after next year.
The number of new apartments is expected to drop by nearly 16% to 408,000 in 2025 from 484,000 in 2024, with new completions bottoming out in 2026 at approximately 400,000 units, according to RentCafe's construction report.
"We're seeing a pullback in projects moving forward across the country right now because developers are unable to get financing for construction loans and they're also struggling to get equity to start new projects," Lybik said.
As a result, Lybik warned that by 2025, vacancies could decrease, pushing the rate of rental growth nationwide to triple from the 1.1% increase seen in the second quarter to between 3% and 3.5%. He forecasts average monthly rent to increase to $1,799 from $1,677.
"At the end of 2025, the average renter will be paying about $1,500 more a year for housing costs," Lybik said."""

N2_news = """In the face of sky-high rents, President Joe Biden is rolling out a new set of principles the White House is calling a "Renters Bill of Rights" in an effort to improve rent affordability and protections for tenants.
The president is directing the Federal Housing Finance Agency (FHFA) to examine limits on rent increases for future investments and actions promoting renter protections. The Federal Trade Commission (FTC) and the Consumer Financial Protection Bureau (CFPB) have been tapped to root out practices that unfairly prevent applicants and tenants from accessing or staying in housing.
This rollout comes as progressive Democrats have asked Biden to direct different agencies, including the FTC, to limit rent increases. While rent control is common in some cities, there has never been federal residential rent control.
Nearly 50 progressive lawmakers, including Sen. Elizabeth Warren (D-MA) and Rep. Alexandria Ocasio-Cortez (D-NY), sent a letter to Biden earlier this month urging the president to take executive action to protect tenants from rising rents.
"In the absence of robust investments in fair and affordable housing, it is clear that additional timely executive action is needed to address the urgent issue of historically high rental costs and housing instability," the lawmakers wrote. "…We urge your Administration to pursue all possible strategies to end corporate price gouging in the real estate sector."
Specifically, lawmakers had called on the president to direct the FTC to issue new regulations defining excessive rent increases and enforce actions against rent gouging, suggestions that are aggressive than what the administration has so far put forth. The letter also asked to have FHFA put in place rent protection for tenants living in properties financed with government-backed mortgage properties, which is more closely aligned with what the president outlined on Wednesday.
In Wednesday's announcement, the administration also sought to rally state and local governments — as well as the private sector — to protect renters.
The Wisconsin Housing and Economic Development Authority and Pennsylvania Housing Finance Agency, for instance, have agreed to cap annual rental increases to 5% per year for federal- or state-subsidized affordable housing.
In the private sector, the National Association of Realtors has also agreed to put new resources towards property managers in their network to promote practices like advertising to prospective tenants that Housing Choice Vouchers are accepted at their property, providing information about rental assistance, and using alternative credit scores for applicants without a detailed credit history.
Despite Wednesday's action, Rep. Jamaal Bowman (D-NY) and Sen. Warren think the actions fall short.
"We believe that the administration can go significantly further to help tenants struggling to pay rent as soon as next week," Bowman said. "We need actions that will urgently address skyrocketing housing costs, keep people housed, and rein in corporate profiteering...I look forward to continuing to work with the Biden Administration on this issue."
Bowman said he plans to work with colleagues in Congress to work on legislation to address high rents.
In advance of receiving the letter, the White House held several conversations with staff from Rep. Bowman and Sen. Warren’s offices about ensuring rental markets are fair and affordable for renters. Lawmakers argued the FTC already has the power to limit rent increases, given Congress has granted the agency power to police unfair and deceptive acts and practices. The argument is that rent hikes which are not proportional to higher costs for the landlord are unfair or deceptive.
But analysts are skeptical the FTC could impose rent controls and that courts would uphold these policies if put in place.
"The Supreme Court is more conservative. It is less inclined to let agencies assert authorities that Congress did not explicitly give them. Congress never empowered the FTC to limit how much residential rents may increase," Cowen analyst Jaret Seiberg said in a recent note. "It is why we would expect the courts to reject this type of regime."
Seiberg also questioned how a federal regime would actually work, given costs vary from city to city and buildings may get remodeled or upgraded. "The FTC is a relatively small agency," Seiberg added. "We don't see how it could account for all this in a way that could survive court challenges."
While legislation could accomplish this, Seiburg said he doesn't see Congress adopting federal rent control.
Rent prices rose 7.45% year over year in November, according to the latest available data from the Rent Report, the slowest annual rise over the last 15 months. Still, this increase is more than triple the 2.2% annual rent increase seen during the same month two years ago."""

L1_news = """Landlord-tenant disagreements are some of the most common issues seen before Virginia's district court judges. Attorneys told News 3 that renter problems amount to roughly 60% to 70% of district court cases. That's why they said it's a good idea for you to know your rights, whether you're the renter or the landlord.
From living conditions to price hikes and unexpected policies, Hampton Roads residents say renting can be great or a headache.
"The place that I am in now, it's okay, but the one before that was an apartment. I had a lot of mildew trouble," said Lisa Golson, of Portsmouth."It was hard to get the landlord or the realtors to come to the house and check out the property."
Three new laws that took effect in Virginia earlier this year will attempt to address some of these issues.
"For the most part they're well thought out," said Larry Lockwood Jr., an attorney at Hunter Law Firm.
The first law, H.B. 1702, requires your landlord, if they own or have more than 10 percent interest in more than four rental units, to give tenants more notice before raising the rent. Renters will get 60 days' notice so they will have more time to find other living arrangements if needed.
"It doesn't really put any additional burdens on landlords but keeps landlords from doing some unscrupulous business practices," said Lockwood.
The second law, H.B. 2441, prevents apartment complexes from evicting tenants one by one. This applies mostly to landlords that are planning to stop renting to a large number of their tenants.
"If a landlord decides they are going to go out of the rental business, or turn their rental building into a condo or tear it down and turn it into a hotel or resort or whatever," Lockwood said. "They can't just let the apartment's agreements expire one by one."
In addition, landlords will have to give tenants 60 days of notice if they're not going to renew many leases (either 20 or more month-to-month tenancies or 50 percent of the month-to-month tenancies within a 30-day period, whichever is greater).
The third law, H.B. 1635, gives tenants a refund option if they move in and then find the apartment is uninhabitable.
"There are rodents, or something you missed on the original walk-through, something you couldn't have seen until you were living there," Lockwood said. "It gives you seven days to give notice to the landlord that it's uninhabitable, you're moving out, you're done."
It's meant to help folks get money back and then into a new place more quickly. 
But if you have an issue, Lockwood said you shouldn't just stop paying rent. Instead, he said, check with an attorney.
"The lawyer would typically say go down to the courthouse and do a tenant's assertion. This is what you do. And they would have been protected. A little bit of knowledge goes a very long way, especially when you're dealing with renting apartments," said Lockwood."""

L2_news = """Even as the housing market in Virginia has slowed, prices remain high statewide, researchers told the Virginia Housing Commission Tuesday. 
“The theme is slow yet competitive,” said Ryan Price, chief economist for Virginia Realtors. “A lot of things are driving that, primarily the increase in interest rates, which has deterred both buyers and would-be sellers.” 
While new home construction in Virginia has continued to grow in 2022, building still lags levels seen in the state historically, said Hamilton Lombard, a demographer for the Weldon Cooper Center for Public Service at the University of Virginia. 
Before the financial crisis of the late 2000s, “we were around 60,000 new homes annually,” he said. “We’re below 40,000 right now.” 
Declines, however, aren’t even across Virginia. Data presented to the commission shows new home construction is down significantly in Northern Virginia and Hampton Roads compared to a decade ago. In contrast, Richmond and smaller metropolitan areas in places like Halifax and Danville have seen upticks in activity. 
“Richmond has really been the one big standout area when you look at Virginia,” said Lombard. 
At the same time, high interest rates are discouraging not only buyers but sellers. While the average interest rate on mortgages held by existing Virginia homeowners is 3.8%, the average interest rate for new mortgages is 6.4%, said Price, making many reluctant to move.
“The incentive to lose that 4%, 3%, 2.5% rate and get a 7% rate — there is no incentive unless you’re forced to move,” he said. 
In response, home sales have slowed. Between January and June of this year, sales statewide were down 24% compared to the same period last year. 
Simultaneously, Virginia home prices are trending upward in the majority of jurisdictions. Since 2018, Price found they have risen 36%, from an average statewide price of $285,000 in 2018 to $389,000 now. 
In some regions, the uptick in remote work spurred by the pandemic appears to be exacerbating price hikes as higher-paid workers move from larger metropolitan areas to smaller ones where wages are lower. 
“What we’ve seen in metro Richmond is that if you’re coming from the West Coast and making West Coast wages or you’re coming from Northern Virginia and D.C. making those wages, you’re coming into this region, folks who live here and are living with our wages are being beat out every time when they’re going for a purchase,” said commission member Laura Lafayette, who is also CEO of the Richmond Association of Realtors. 
While many of the trends Virginia is experiencing are playing out nationwide, Virginia home construction is lagging that of neighboring Tennessee and North Carolina. Lombard said Tennessee is building about a third more housing units than Virginia, while North Carolina is building double. Both have also seen far higher job growth than Virginia since January 2020, with Virginia adding 56,800 jobs, Tennessee 172,900 and North Carolina 284,500, according to Price. 
“North Carolina is kicking Virginia’s butt as far as job growth,” said Del. Danny Marshall, R-Danville, Tuesday. 
More affordable housing elsewhere may be a key driver of population losses from Virginia to more southern states, said Price.
“They’re building more housing in these states,” he said. “So the fact there are homes available, there are good jobs there, it is attracting a lot of folks away from Virginia. We also have good jobs here, but our housing is more expensive, particularly in the job centers.”
Asked by Del. David Bulova, D-Fairfax, if there was anything the state could do policywise to ease some of the housing pressures, Price said many solutions have emerged from local governments.
“The places that have started to move the needle particularly on the supply side are really making strides at the local level more so than the state level with respect to zoning changes — whether it be loosening up the zoning in some places, whether it be concentrating a lot of the new housing in specific corridors that are near transit, that are near job centers, whether it be making the process to densify in some cases easier, making the permit process easier,” he said."""

classification_prompt = """You are a classifier. You will be given a news article and a message discussing that article. Your task is to classify the message into one of seven possible categories by following a two-step process.
Instruction:

Step 1: For each question, firstly determine the value for variables A, B, C, D, and E.
1. A: Determine whether this question is about explanation of the meaning of a word. 
If yes, set A = 1; if not, set A = 0.
2. B: Determine whether this question is about summary of texts.
If yes, set B = 1; if not, set B = 0.
3. C: Determine whether this question is about factual information. Factual information includes data, facts, figures or statements that can be directly found on the news article or external sources. It should have definite answers. Questions that do not have definite answers or are open to alternative answers are NOT about factual information, such as "Why" questions or questions that asks for explanation, reasoning or opinions.
If yes, set C = 1; if not, set C = 0.
4. D: Determine whether this question is about interpretation of things mentioned in the article or anything extended from the article. Interpretation refers to the explanation, reasoning or opinions on issues, facts, or data. 
If interpreting things mentioned in the article, set D = 1; if interpreting things extended from the article, set D = 2; if not about the interpretation of content, set D = 0.
5. E: Determine whether this question is about a potential action, e.g., a question following the “first-person (me/us) pronoun + verb” or “what if [potential action]” structure. If yes, Set E = 1; if not, set E = 0.

Step 2: based on the values you assigned to the variables, determine the category for this message based on the rules below:
If A = 1: Category = 1, 
Elif B = 1: Category = 2,
Elif E = 1: Category = 6,
ElIf D = 1: Category = 3, 
Elif D = 2: Category = 5,
Elif C = 1: Category = 4,
Else: Choose the category that this message is closest to based on the reasoning above.

For each [Message-Article] pair, respond in this format:
[A Value, A Reasoning; B Value, B Reasoning; C Value, C Reasoning: D Value, D Reasoning; E Value, E Reasoning; Final Category]

Here is an example:
News article: I do think we've seen the peak rent price for 2023," Danielle Hale, Realtor.com chief economist, told Yahoo Finance Live.
For the third consecutive month, asking rent prices — or vacant units advertised by landlords — have fallen, declining 1% over the same period a year ago, according to Realtor.com’s Mid-year rental report.
"We're at the point in the season where we typically see rents decline. And rents are down from a year ago as they have been for the past few months and so that means we are likely to see that 2022 was the peak for rents. And we're starting to see some decline," Hale added.
The big reason for the slowdown: more housing. In the past three years, builders have added 1.2 million apartments to the market, with 2023 shaping up to be a peak year as developers expect to open 460,860 rentals by year-end, according to RentCafe's construction report.
"While the time-to-completion on multifamily properties is much longer than single-family homes, in our view this glut of multifamily supply will eventually suppress apartment rent growth," Vinay Viswanathan, a fixed income strategist at Goldman Sachs, wrote in a note for the firm's housing team.
But new financing challenges are emerging that could threaten the supply — and rental price — outlook beyond next year.
Already, West Coast metro areas are facing an apartment construction slump.
Data from CoStar Group shows developers are on pace to build less than 32,000 apartments in Los Angeles, San Francisco, San Diego, San Jose, Seattle, and Portland this year — marking a roughly 20% drop compared with 2021 levels.
"It's the worst thing that could be happening," Jay Lybik, national director of multifamily analytics at CoStar Group, said in a statement. "The region still doesn't have enough housing."
So far this year has been the slowest for the West Coast, developing less than half as many apartments as the first two quarters of 2021. The tally hit 10,687 in 2023. That falls short of the 19,434 starts recorded in the first half of 2021.
A memo from a Los Angeles project’s development team revealed in June that it wanted to reduce the project’s total units and commercial space in response to "rising construction costs and the increasingly uncertain climate for capital sources to fund the project."
But the lack of construction could become a bigger problem nationwide after next year.
The number of new apartments is expected to drop by nearly 16% to 408,000 in 2025 from 484,000 in 2024, with new completions bottoming out in 2026 at approximately 400,000 units, according to RentCafe's construction report.
"We're seeing a pullback in projects moving forward across the country right now because developers are unable to get financing for construction loans and they're also struggling to get equity to start new projects," Lybik said.
As a result, Lybik warned that by 2025, vacancies could decrease, pushing the rate of rental growth nationwide to triple from the 1.1% increase seen in the second quarter to between 3% and 3.5%. He forecasts average monthly rent to increase to $1,799 from $1,677.
"At the end of 2025, the average renter will be paying about $1,500 more a year for housing costs," Lybik said.

Message:
What are the implications for Southern Virginia?

Response:
[ A Value: 0, The message does not ask for the explanation of a word;  
B Value: 0, The message does not ask for a summary of the article;  
C Value: 0, The message does not ask for factual information directly found in the article;  
D Value: 2, The message extends the discussion to a new geographical area (Southern Virginia) and seeks an interpretation of potential outcomes based on the article’s information;  
E Value: 1, The message is asking about potential implications, which relates to future consequences or actions;  
Final Category: 6]


Your task:
News article: 
{news}

Message: 
{message}

Response:
"""


async def dispatch_openai_requests(
        messages_list,
        temperature=0.0,
):
    """Dispatches requests to OpenAI API asynchronously.
    """
    async_responses = [
        async_client.chat.completions.create(
            model="gpt-4o",
            messages=x,
            temperature=temperature,
            max_tokens=200,
            top_p=0.0,
            frequency_penalty=0.0,
            presence_penalty=0.0
            # reasoning_effort="high"
        )
        for x in messages_list
    ]
    return await asyncio.gather(*async_responses)


def async_chat_completion(prompts):
    try:

        messages = [[{"role": "user", "content": p}] for p in prompts]

        print(f"Sending {len(messages)} prompts in a batch to OpenAI ...")
        responses = asyncio.run(
            dispatch_openai_requests(
                messages_list=messages,
            )
        )

        return [r.choices[0].message.content for r in responses]

    except Exception as e:
        print("Connection error")
        print(e)
        return prompts


def main():
    # Load the Excel file (adjust the file path as necessary)
    file_path = 'News questions_by attributes_English.xlsx'  # Replace with the correct file path
    output_file_path = 'updated' + file_path  # Replace with your desired output path
    df = pd.read_excel(file_path)

    # Extract the 'Questions' and 'Category' columns into lists
    news_id = df['NewsID'].tolist()
    questions = df['Questions'].tolist()
    categories = df['Category'].tolist()

    prompt_list = []
    for m, n in zip(questions, news_id):
        if news_id == "N1":
            news = N1_news
        elif news_id == "N2":
            news = N2_news
        elif news_id == "L1":
            news = L1_news
        else:
            news = L2_news
        prompt_list.append(classification_prompt.replace("{message}", m).replace("{news}", news))

    BATCH_SIZE = 10
    final_decision, final_gt, full_reason = [], [], []

    # print(prompt_list[0])

    for i in range(0, len(prompt_list), BATCH_SIZE):
        batch_prompt_list = prompt_list[i: i + BATCH_SIZE]
        response_list = async_chat_completion(batch_prompt_list)

        for r, c in zip(response_list, categories):
            final = r.split("Category: ")[-1]
            final = final.split("\n\n")[0].strip().replace("]", "").replace("] ", "")
            try:
                final_decision.append(int(final))
                final_gt.append(int(c))
                full_reason.append(r)
            except:
                print(final)
                # print(r)
                final_decision.append(1)
                final_gt.append(int(c))
                full_reason.append(r)
            # print(r)
            # print(final)
            # print(c)
            # print("=" * 50)

        time.sleep(5)

    # correct_matches = sum(1 for a, b in zip(final_decision, final_gt) if a == b)
    # # Calculate accuracy
    # print(correct_matches)
    # accuracy = (correct_matches / len(final_gt)) * 100
    # print(f"Accuracy: {accuracy:.2f}%")

    # print(final_decision)
    # print(full_reason)
    # exit()

    # Add the new columns to the DataFrame
    df["GPT Category"] = final_decision
    df["Reasons"] = full_reason

    # Save the updated DataFrame to a new Excel file
    df.to_excel(output_file_path, index=False)

    # Filter the DataFrame for rows where GPT Category is not equal to Category
    df_filtered = df[df["GPT Category"] != df["Category"]]

    # Define a new output file path for the filtered data
    filtered_file_path = "filtered_" + file_path  # e.g., "filtered_News questions_by attributes_English.xlsx"

    # Save the filtered DataFrame to a new Excel file without the index
    df_filtered.to_excel(filtered_file_path, index=False)


if __name__ == '__main__':
    main()
