import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { sendEmail } from './emailHelper';

interface UserDto {
  firstName: string;
  lastName: string;
  email: string;
}

interface QuestionDto {
  id: string;
  title: string;
  returningAnswer: string;
  postedBy: UserDto;
  createdAt: Date;
}

export const sendWeeklyReport = async () => {
  const today = new Date();
  const preWeek = new Date();
  preWeek.setDate(today.getDate() - 7);

  const questions = await prisma.communityQuestion.findMany({
    where: {
      createdAt: {
        lte: today,
        gt: preWeek,
      },
    },
    select: {
      id: true,
      title: true,
      returningAnswer: true,
      postedBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      createdAt: true,
    },
  });

  let questionsListHtml = `<body dir="auto">
  <div bgcolor="#f3f4ef" marginwidth="0" marginheight="0" style="font-family:Roboto,Helvetica,Arial,sans-serif">
    <table width="100%" height="100%" style="border:0" cellpadding="0" cellspacing="0">
      <tbody>
        <tr>
          <td align="center" valign="top" bgcolor="#f3f4ef" style="padding-left:20px;padding-right:20px;background:#fff">
            <div style="font-size:20px">
              <br>
            </div>
            <table border="0" bgcolor="#ffffff" style="color:#333;line-height:23px;text-align:left;font-size:15px;background:#FFF;border:0;border-radius:4px;"
              width="600" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td style="padding:2em 2.5em 2.4em 2em">
                    <a href="https://www.synkd.life/">
                      <img src="https://builds.byinspired.com/Mailgun/Images/Synkd_logo.png" alt="Synkd_Logo" align="right" width="125" height="39"
                        border="0" />
                    </a>
                    <br/>
                    <hr style="border-top-color:#eecbee;opacity:0.4;border-top-style:solid;padding:0;border-width:1px 0 0">
                    <div style="text-align: center;">
                        <h2>Weekly report of new questions</h2>
                    </div>
                    <br/> 
                        <p>
                            This is the list of new questions which are created at the previous week<br />
                            There were ${questions.length} new question${
    questions.length > 1 ? 's' : ''
  } posted by users.<br />
                        </p>
                    
                  </td>
                </tr>
              </tbody>
            </table>

            <br />            

            <table border="0" bgcolor="#ffffff" style="color:#888;line-height:23px;text-align:left;font-size:15px;background:#F3F4F5;border:0;border-radius:4px;"
              width="600" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td style="padding:2em 2.5em 2.4em 2em">`;

  questions.forEach((q: QuestionDto, i: number) => {
    questionsListHtml += `
      <p>
          <span style="font-weight: bold">
            Question #${i + 1}
          </span>
      </p>

      <p>
          <span style="font-weight: bold">
              Scope: 
          </span>
          Hub
      </p>

      <p>
          <span style="font-weight: bold">
              Title: 
          </span>
          ${q.title}
      </p>

      <p>
          <span style="font-weight: bold">
              Answer: 
          </span>
          ${q.returningAnswer}
      </p>
      
      <p>
          <span style="font-weight: bold">
              Posted By: 
          </span>
          ${q.postedBy.firstName} ${q.postedBy.lastName} (${q.postedBy.email})
      </p>

      <p>
          <span style="font-weight: bold">
              Posted At: 
          </span>
          ${new Date(q.createdAt).toString()}
      </p>

      <p>
        <span style="font-weight: bold">
          Link: 
        </span>
        <a style="background: #ac75ab; color: white; padding: .2em 1em; border-radius: 5px;" href='https://community-dev.synkd.life/question/h/${
          q.id
        }' target='_blank'>
          Link to question
        </a>
      </p>

      <hr /><br />
`;
  });

  questionsListHtml += `</td>
  </tr>
</tbody>
</table>

<br />
</td>
</tr>
</tbody>
</table>
</div>
</body>`;

  const adminEmail = process.env.ADMIN_EMAIL || 'IbrahimZauroh@gmail.com';
  const emailResult = await sendEmail({
    from: {
      name: 'Synkd',
      email: 'no-reply@synkd.life',
    },
    to: adminEmail,
    subject: 'Weekly report of new questions',
    html: questionsListHtml,
  });
};
