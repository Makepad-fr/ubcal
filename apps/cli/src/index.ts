import UBCalCookieDumper from "@makepad/ubcal-cookie-dumper";
import {v4 as uuidv4} from 'uuid';
import {tmpdir} from 'os';
import {join} from 'path';
import UBCalCourseExtractor from "@makepad/ubcal-course-extractor";
import {Transform} from 'stream';
import {Console} from 'console';

/**
 * Generates the unique browser context path
 * @returns Unique browser context id
 */
function generateContextPath(): string {
    return join(tmpdir(),`${uuidv4()}.json`);
}

async function main() {
    const dumper = await UBCalCookieDumper.init();
    console.info('Please login on the browser to continue');
    await dumper.waitForSuccessMessage();
    console.info('Thank you!');
    const contextPath = generateContextPath();
    await dumper.saveBrowserContext(contextPath);
    await dumper.close();
    const extractor = await UBCalCourseExtractor.init(contextPath);
    const studentDetails = await extractor.studentDetails();
    console.info(`Welcome ${studentDetails.fullName}`);
    console.info('Getting your course details');
    const studentCourseList = await extractor.courseDetails();
    table(studentCourseList);
    await extractor.close();
    // TODO: Continue with the student course details and the student details
}

function table(input: object[]) {
    // @see https://stackoverflow.com/a/67859384
    const ts = new Transform({ transform(chunk, _, cb) { cb(null, chunk) } })
    const logger = new Console({ stdout: ts })
    logger.table(input)
    const table = (ts.read() || '').toString()
    let result = '';
    for (let row of table.split(/[\r\n]+/)) {
      let r = row.replace(/[^┬]*┬/, '┌');
      r = r.replace(/^├─*┼/, '├');
      r = r.replace(/│[^│]*/, '');
      r = r.replace(/^└─*┴/, '└');
      r = r.replace(/'/g, ' ');
      result += `${r}\n`;
    }
    console.log(result);
  }

main().then(() => {
    process.exit(0);
});