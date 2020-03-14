use backend;
use dotenv::dotenv;
use structopt::StructOpt;

#[derive(StructOpt)]
struct Args {
    #[structopt(short, long)]
    password: String,
}

#[paw::main]
fn main(args: Args) {
    dotenv().ok();
    println!("hash: {}", backend::session::hash_password(&args.password));
}
