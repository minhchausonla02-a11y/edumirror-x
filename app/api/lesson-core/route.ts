import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { lesson_text } = await req.json(); // hiện chưa dùng, chỉ demo
  const core = [
    {
      section_id: "S1",
      title: "Ôn dạng chuẩn",
      objectives: ["Nhận diện ax^2+bx+c", "Điều kiện a≠0", "Hệ số a,b,c"],
      misconceptions: ["Tưởng a=0 vẫn là bậc hai", "Nhầm dấu của b"],
    },
    {
      section_id: "S2",
      title: "Đỉnh & trục đối xứng",
      objectives: ["x_đỉnh = -b/2a", "Giá trị min/max theo dấu a", "Trục x = -b/2a"],
      misconceptions: ["a>0 thì cực đại", "Quên -b/2a"],
    },
  ];
  return NextResponse.json(core);
}
